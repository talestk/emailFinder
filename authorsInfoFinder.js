var fs = require('fs');
var CSVStream = require('csv-streamer');
var csv = new CSVStream({headers: true, delimiter: '\t'});
var request = require('request');
var cheerio = require("cheerio");

request = request.defaults({jar: true});


var resultLinks = [];
var authorsNames = {};

//{ Name: 'Tales Takemiya',
//	Country: 'Brazil',
//	Institution: 'Department of Gastroenterology, Brazilian Hospital, Brazil'}
csv.on('data', function (line) {
	// lets get the name and institution from the data table
	authorsNames[line['Name']] = line['Institution'];
	// splitting to leave aside unwanted data
	var institution = line['Institution'].split(',');
	// here we start the request to the google page using the right encoding for the URL with author name and first 2 pieces of the institution
	request.get('https://www.google.com/search?gws_rd=ssl&site=&source=hp&q=' + encodeURIComponent(line['Name'] + institution[0], institution[1]))
		.on('data', function (data) { // when data is received we start processing it
			// cheerio will help us with parsing the data to html friendly format
			var $ = cheerio.load(data);

			// for each link on the results
			$('.g a').each(function () {
				var link = $(this);
				// we get the link string
				var text = link.attr('href');
				if (text.indexOf('/search?') < 0 && text.indexOf('webcache.google') < 0) {
					// remove unwanted characters and push it to a array
					resultLinks.push(text.replace('/url?q=', '').split('&')[0]);
				}
			});
		}).on('end', function () {
			// for every link we got from google
			for (var link in resultLinks) {
				if (resultLinks.hasOwnProperty(link)) {
					// we visit it
					request.get(resultLinks[link])
						.on('data', function (data) {
							var $ = cheerio.load(data);
							// trim out the html tags
							var contentNoTags = removeTags($.html());
							// split by words
							var wholePageByWords = contentNoTags.split(' ');
							for (var word in wholePageByWords) {
								if (wholePageByWords.hasOwnProperty(word)) {
									// check to see if it is an email
									var split = line['Name'].split(' ');
									if (validateEmail(wholePageByWords[word])) {
										console.log(line['Name'] + '\t' + wholePageByWords[word])
									}
								}
							}
						}).on('error', function(error) {
							console.log(error);
						})
				}
			}
		}).on('error', function(error) {
			console.log(error);
		})
});

/**
 * removes all html tags
 * http://stackoverflow.com/questions/13911681/remove-html-tags-from-a-javascript-string
 * @param string
 * @returns a formatted {string}
 */
function removeTags(string) {
	return string.replace(/<[^>]*>/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.replace(';', ',')
		.replace('.', '')
		.trim();
}

/**
 * removes all html tags
 * http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
 * @param string
 * @returns a formatted {string}
 */
function validateEmail(email) {
	var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}
// init
fs.createReadStream('testListOfAuthors.txt').pipe(csv);
