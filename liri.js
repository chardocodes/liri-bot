require("dotenv").config();
const request = require("request");
const spotifyApi = require("node-spotify-api");
const fs = require("fs");
const axios = require("axios");
const fetch =require("fetch");

const secretKeys = require("./keys.js");
// console.log(secretKeys.spotify)

let liri = {
  command: "",
  inputArr: [],
  

  run: function () {
    // console.log("go liri!");
    this.command = process.argv[2];
    //all inputArr after the command are combined into one list and joined by spaces, for use later
    if (process.argv.length > 2) {
      this.inputArr = process.argv.slice(3, process.argv.length).join(" ");
    }
    //run a command
    this.runCommand(this.command, this.inputArr, false).then(function (results) {
      //log the results when finished
      console.log(results);
      liri.logOutput(liri.command + "\n---\n" + results + "\n---\n");
    });

  },

  runCommand: function (command, inputArr, recurse) {
    //returns a promise for outputting results
    return new Promise(function (resolve, reject) {
      // each command function returns a promise to ensure that the information is retrieved before it is returned

      if (command === "spotify-this-song") {
        liri.spotifyThisSong(inputArr).then(function (results) {
          resolve(results);
        });
      }
      else if (command === "movie-this") {
        liri.movieThis(inputArr.replace(" ", "+")).then(function (results) {
          resolve(results);
        });
      }
      else if( command === "concert-this"){
        liri.bands_in_town(inputArr).then (function (results){
          resolve(results);
        });
      }
      else if (command === "do-what-it-says") {
        if (!recurse) {
          liri.doWhatItSays();
          resolve("");
        }
        else {
          resolve("can't call do-what-it-says within random.txt");
        }

      }
      else {

        resolve("could not recognize command");
      }
    });
  },

  spotifyThisSong: function (song) {
    // if no song is specified, defaults to The Sign
    // console.log(liri.keys.spotifyKeys)
    if (!song) {
      song = "The Sign Ace of Base";
    }
    return new Promise(function (resolve, reject) {
      var spotify = new spotifyApi(secretKeys.spotify);
      spotify.search({ type: 'track', query: song })
        .then(function (response) {
          // grabbing the first search result, which is (hopefully) the desired result
          var resultTrack = response.tracks.items[0];
          var artistlist = [];
          //there may be multiple artists (spotify returns a list), so I grab them all
          for (var a in resultTrack.artists) {
            artistlist.push(resultTrack.artists[a].name);
          }
          if (artistlist.length > 0) {
            artistlist = artistlist.join(", ");
          }
          resolve("Artist(s): " + artistlist + "\nTrack Name: " + resultTrack.name + "\nPreview URL: " + resultTrack.preview_url + "\nAlbum: " + resultTrack.album.name);
        })
        .catch(function (err) {
          console.log(error);
        });
    });
  },

  movieThis: function (movie) {
    // console.log(keys.omdbkey);
    if (!movie) {
      movie = "Forrest Gump";
    }
    return new Promise(function (resolve, reject) {
      var queryUrl = "http://www.omdbapi.com/?t=" + movie + "&y=&plot=short&apikey=" + secretKeys.omdbkey;
    
      request(queryUrl, function (error, response, body) {
        //if there's no error and the response is a success...
        if (!error && response.statusCode === 200) {
          var movieinfo = JSON.parse(body);
          //the ratings are in a list of objects
          var imdbrating, rtrating;
          for (var r in movieinfo.Ratings) {
            if (movieinfo.Ratings[r].Source === 'Rotten Tomatoes') {
              rtrating = movieinfo.Ratings[r].Value;
            }
            else if (movieinfo.Ratings[r].Source === 'Internet Movie Database') {
              imdbrating = movieinfo.Ratings[r].Value;
            }
          }
          //the imdb rating can appear in two places, so just to be safe, if the first isn't found, the script checks the second as well.
          if (!imdbrating) {
            imdbrating = movieinfo.imdbRating + "/10";
          }
          resolve("Title: " + movieinfo.Title + "\n" + "Year: " + movieinfo.Year + "\n" + "IMDB Rating: " + imdbrating + "\nRotten Tomatoes Rating: " + rtrating + "\nCountry: " + movieinfo.Country + "\nLanguage: " + movieinfo.Language + "\nPlot: " + movieinfo.Plot + "\nActors: " + movieinfo.Actors);
        }
        else {
          console.log(error);
        }
      });
    });
  },

  bands_in_town: function () {
    request("https://rest.bandsintown.com/artists/" + fetch + "/events?app_id=codingbootcamp", function (error, response, body) {        
    console.log(response);    
    if (!error && response.statusCode === 200) {
            var body = JSON.parse(body)
            console.log("Upcoming shows for " + fetch + ": ")
            for(var set in body) {
                var date = moment(body[set].datetime).format("MM/DD/YYYY")
                // console.log(response.venue);
                console.log("The venue is: " + body[set].venue.name);
                console.log("The venue is at: " + body[set].venue.city + ", " + body[set].venue.country);
                console.log("The concert is on: " + date);
                console.log("______________________________________"); 
            }
        }
        else {
            console.log("Error, please try again later.");
        }
    });
},

  doWhatItSays: function () {
    fs.readFile("random.txt", "utf8", function (error, data) {
      if (error) {
        console.log(error);
        return;
      }
      // parse each line 
      var commandlist = data.split("\n");
      var promiselist = [];
      for (var c in commandlist) {
        //trim white space
        if (commandlist[c]) {
          var currentCommand = commandlist[c].trim().split(",");
          //promises = constructor and the methods and properties of objects
          promiselist.push(liri.runCommand(currentCommand[0], currentCommand[1], true));

        }
      }
      var output = "";
      //Promise.all waits untill all promises are resolved before loggin values
      Promise.all(promiselist).then(function (values) {
        for (var v in values) {
          console.log(values[v]);
          //I gather all the output into one variable and write it at once to keep the commands' output in the same order as their execution
          output += commandlist[v].trim() + "\n---\n" + values[v] + "\n---\n";
        }
        liri.logOutput(output);
      });
    });
  },

  logOutput: function (output) {
    fs.appendFile("log.txt", output, function (err) {
      if (err) {
        console.log(err);
      }
    });
  }

};

liri.run();

