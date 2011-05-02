/**
 * @preserve Spark JavaScript Library v3.0.0
 * http://sparkjs.co.uk/
 * 
 * Copyright 2011, Oliver Caldwell
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://sparkjs.co.uk/licence.html
 */
var Spark = (function() {
	// Create the object
	function Spark(){}
	
    /**
     * Adds a variable to Spark's prototype.
     * This is used to extend Spark with plugins.
     * 
     * @param {String} name Name you wish to add your variable under
     * @param {Mixed} toAdd Variable you wish to add
     */
	Spark.prototype.extend = function(name, toAdd) {
		// Add the object
		Spark.prototype[name] = toAdd;
		
		// If the object is actually an object, then assign the Spark instance to it
		if(typeof toAdd === 'object') {
			toAdd.instance = this;
		}
	};
	
    /**
     * Create a clone of the object. This should be done when anything is being stored in it for chaining.
     * Otherwise added variables will be there for ever.
     * This way they only exist within that chain.
     * 
     * @returns {Object} The copy of the object
     */
	Spark.prototype.clone = function() {
		return new Spark();
	};
	
	/** @private */
	return new Spark();
}());

// Set up the alias for the find function as long as $ is not already in use
if(typeof window.$ === 'undefined') {
	var $ = function(parameters, context) {
		return Spark.find(parameters, context);
	};
}
/**
 * Runs the specified function when the DOM is ready. This is the staple diet of any script using Spark.
 * For best results across all browsers always wrap your code within the ready function like so.
 * 
 *     Spark.ready(function() {
 *         // Your code goes here
 *     });
 * 
 * @param {Function} fn Function to be run when the DOM is ready
 */
Spark.extend('ready', function(fn) {
	// Initialise any required variables
	var that = this.clone();
	
	/**
	 * Runs the call back and sets the already run flag to true
	 */
	function ready() {
		that.find(document).data('domReady', true);
		fn();
	}
	
	if(!that.find(document).data('domReady')) {
		// Check if we can use addEventListener
		if(window.addEventListener) {
			// For all browsers except IE
			document.addEventListener('DOMContentLoaded', ready, false);
		}
		else {
			// For IE
			(function() {
				// Create the custom tag
				var tempNode = document.createElement('document:ready');

				try {
					// See if it throws errors until after it is ready
					tempNode.doScroll('left');

					// Call the function
					ready();
				}
				catch(err) {
					setTimeout(arguments.callee, 0);
				}
			}());
		}
	}
	else {
		fn();
	}
});
/**
 * The AJAX object contains three functions, `get`, `post` and `getJSON`.
 * You can call these functions like so.
 * 
 *     Spark.ajax.get('foo.json');
 *     Spark.ajax.post('foo.json');
 *     Spark.ajax.getJSON('foo.json', 'handlerFunction'); // Works cross domain (can retreve tweets etc)
 * 
 * The above examples are synchronous requests, to perform an asynchronous request you must pass a callback, like so. This does not apply to the `getJSON` method. This must always have a callback for the data to be passed to.
 * 
 * Do not make the mistake of passing a function. This must be a string and represent the functions name. Not the function its self.
 * 
 *     Spark.ajax.post('foo.json', false, function(data) {
 *         console.log(data);
 *     });
 * 
 * The argument passed to the callback, in this case data, contains the data retrieved from the specified file. If the request failed then the passed variable will be false. The same goes for synchronous requests, if the request fails, it will return false.
 * 
 * The second argument is for the parameters, if false no parameters will be sent. Here is an example of getting a file asynchronously with a parameter and a check to make sure the request worked.
 * 
 *     Spark.ajax.get('foo.json', {
 *         foo: 'bar'
 *     }, function(data) {
 *         if(data) {
 *             console.log(data);
 *         }
 *         else {
 *             console.log('An error occurred.');
 *         }
 *     });
 * 
 * In the `getJSON` method, these arguments are reversed, you must pass a callback and then an optional parameters object.
 * 
 *     Spark.ajax.getJSON('http://api.twitter.com/1/statuses/user_timeline.json', 'handle', {
 *         screen_name: 'SparkJavaScript',
 *         count: '5'
 *     });
 * 
 * The code above would pull the latest five tweets from Spark's twitter account and pass them in an object to a function called `handle`.
 */

/** @private */
Spark.extend('ajax', {
	/**
	 * Selects what AJAX object to use
	 * 
	 * @returns {Object} The correct AJAX object for this browser
	 * @private
	 */
	initialise: function() {
		// Pass back the correct object
		return (typeof XMLHttpRequest === 'undefined') ? 
			new ActiveXObject('Microsoft.XMLHTTP') :
			new XMLHttpRequest();
	},
	
	/**
	 * Turns an object of parameters into a string
	 * 
	 * @param {Object} parameters An object of parameters
	 * @returns {String} The combined string, ready to be appended to a filename
	 * @private
	 */
	buildParameterString: function(parameters) {
		// Initialise any required variables
		var p = null,
			built = '';
		
		// Loop through the parameters appending them to the filename
		for(p in parameters) {
			// Make sure it is not a prototype
			if(parameters.hasOwnProperty(p)) {
				// Add the parameter
				built += encodeURIComponent(p) + '=' + encodeURIComponent(parameters[p]) + '&';
			}
		}
		
		// Remove the trailing ampersand and return the escaped string
		return built.slice(0, built.length - 1);
	},
	
	/**
	 * Pass the data to the callback when the request is complete
	 * 
	 * @param {Object} req The AJAX request object
	 * @param {Function} callback The callback function that the data should be passed to
	 * @private
	 */
	handleCallback: function(req, callback) {
		// Listen for the change in state
		req.onreadystatechange = function() {
			// Check if it is finished
			if(req.readyState === 4) {
				// Check the status
				if(req.status === 200) {
					// It's all good, Pass the data to the callback
					callback(req.responseText);
				}
				else {
					// There was an error so pass false to the callback
					callback(false);
				}
			}
		};
	},
	
    /**
     * Perform a get request with optional parameters either synchronously or asynchronously
     * 
     * @param {String} file Path of the target file
     * @param {Object} parameters The arguments you wish to pass to the file
     * @param {Function} callback If set, the call become asynchronous and the data is passed to it on completion, it will pass false if it failed
     * @returns {String|Boolean} The data retrieved from the file if it is a synchronous call, returns false if it failed
     */
	get: function(file, parameters, callback) {
		// Set up the AJAX object
		var req = this.initialise();
		
		// Make sure parameters is an object
		if(parameters) {
			// Add the parameters to the file name
			file += '?' + this.buildParameterString(parameters);
		}
		
		// Check for the callback
		if(callback) {
			// It exists, so pass it to the callback handling function
			this.handleCallback(req, callback);
		}
		
		// Open the request, if the callback is set then make it asyncronous
		req.open('GET', file, typeof callback === 'function');
		
		// Send the request
		req.send();
		
		// Check if the callback has not been passed
		if(!callback) {
			if(req.status === 200) {
				// Just return the content because it was a syncronous request
				return req.responseText;
			}
			else {
				// There was an error so return false
				return false;
			}
		}
	},
	
    /**
     * Perform a post request with optional parameters either synchronously or asynchronously
     * 
     * @param {String} file Path of the target file
     * @param {Object} parameters The arguments you wish to pass to the file
     * @param {Function} callback If set, the call become asynchronous and the data is passed to it on completion, it will pass false if it failed
     * @returns {String|Boolean} The data retrieved from the file if it is a synchronous call, returns false if it failed
     */
	post: function(file, parameters, callback) {
		// Set up the AJAX object
		var req = this.initialise();
		
		// Check for the callback
		if(callback) {
			// It exists, so pass it to the callback handling function
			this.handleCallback(req, callback);
		}
		
		// Open the request, if the callback is set then make it asyncronous
		req.open('POST', file, typeof callback === 'function');
		
		// Set the headers
		req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		
		// Only send the data if it is set
		if(parameters) {
			req.send(this.buildParameterString(parameters));
		}
		else {
			req.send();
		}
		
		// Check if the callback has not been passed
		if(!callback) {
			if(req.status === 200) {
				// Just return the content because it was a syncronous request
				return req.responseText;
			}
			else {
				// There was an error so return false
				return false;
			}
		}
	},
	
    /**
     * Load a JSON file and pass it to the callback function
     * 
     * @param {String} file Path of the target file
     * @param {String} callback Function name to pass the parsed JSON to
     * @param {Object} parameters The arguments you wish to pass to the file
     */
	getJSON: function(file, callback, parameters) {
		// Initialise any required variables
		var params = false;
		
		// Get the parameter string if required
		if(parameters) {
			params = this.buildParameterString(parameters);
		}
		
		// Load the file
		this.instance.load(file + '?callback=' + callback + ((params) ? '&' + params : ''));
	}
});
/**
 * The cookie function is used to set or get cookies. To get the contents of a cookie simply call the function and provide the name of the cookie you wish to get the contents of. For example.
 * 
 *     // Returns the content of the cookie 'foo'
 *     Spark.cookie('foo');
 * 
 * To set a cookie you just have to pass some content along with a name, like so.
 * 
 *     // Sets the cookie 'foo' to 'bar'
 *     Spark.cookie('foo', 'bar');
 * 
 * You can also provide an optional duration which is how long the cookie should last for in milliseconds. If you do not provide a duration it will expire when the session ends. Say you wanted to set the previous cookie and make it last for five seconds, you would use the following line.
 * 
 *     // Sets a cookie that lasts five seconds
 *     Spark.cookie('foo', 'bar', 5000);
 * 
 * @param {String} name The name of the cookie you wish to get or set
 * @param {String} content If passed the cookie will be set with this as it's content
 * @param {Number} duration The amount of milliseconds you wish the cookie to last for, if not set then it will last for the session
 * @returns {String} The content of the cookie who's name you specified
 */
Spark.extend('cookie', function(name, content, duration) {
	// Initialise any required variables
	var cookies = document.cookie.split(';'),
		i = null,
		cookie = null,
		date = new Date();
	
	// Check if we need to get or set
	if(typeof content === 'undefined') {
		// Get the cookie
		// Loop through all the cookies
		for(i = 0; i < cookies.length; i++) {
			// Grab the current cookie and trim any whitespace
			cookie = cookies[i].replace(/^\s+/g, '');
			
			// Check if the cookie contains the name
			if(cookie.indexOf(name + '=') === 0) {
				return cookie.substring(name.length + 1, cookie.length);
			}
		}
		
		// Return false if we did not find it
		return false;
	}
	else {
		// Set the cookie
		// Check for a passed duration
		if(typeof duration !== 'undefined') {
			// Add on the duration
			date.setTime(date.getTime() + duration);
			expires = '; expires=' + date.toGMTString();
		}
		else {
			// Otherwise set the expires to nothing
			expires = '';
		}
		
		// Set the cookie
		document.cookie = name + '=' + escape(content) + expires + '; path=/';
	}
});
/**
 * The find function is Spark's selector engine. It supports all of the [CSS2 selectors](http://www.w3.org/TR/CSS2/selector.html) apart from the link and dynamic pseudo selectors.
 * Say you wanted to find all p tags that where within a div, you would use the following line.
 * 
 *     Spark.find('div p');
 * 
 * You can also used the dollar alias for the find function like so.
 * 
 *     $('div p');
 * 
 * This saves a few characters and helps you distinguish lines that involve elements from ones that do not.
 * 
 * You can also pass a context to search within, for example.
 * 
 *     var el = $('div#contactForm');
 *     $('div p', el);
 * 
 * The elements are placed within the Spark object. The object is then assigned a length so you can treat it as an array. There is also an array of elements located in the `elements` section of the object.
 * 
 * You can also pass element objects to it and they will be adopted. If you pass an event object it will adopt the events target.
 * 
 * @param {String|Object} parameters The criteria the element must meet to be selected
 * @param {Object} context The place you wish to start the search from, defaults to document
 * @returns {Object} Returns the Spark object to allow chaining
 */
Spark.extend('find', function(parameters, context) {
	// Initialise any required variables
	var found = [],
		filtered = [],
		ctx = (typeof context !== 'undefined') ? context : document,
		i = null,
		e = null,
		tempFound = null,
		classes = null,
		built = this.clone();
	
	// Check if parameters is not an actual search object
	if(typeof parameters === 'object') {
		if(typeof parameters.nodeName === 'string') {
			// They passed an element, this needs to be adopted into the chain
			built[0] = parameters;
			built.elements = [parameters];
			built.length = 1;
			
			// Return the object with the adopted value
			return built;
		}
		else if(typeof parameters.target === 'object') {
			// They passed an event object, its target needs to be adopted into the chain
			built[0] = parameters.target;
			built.elements = [parameters.target];
			built.length = 1;
			
			// Return the object with the adopted value
			return built;
		}
	}
	
	/**
	 * Removes duplicate values from an array
	 * 
	 * @param {Array} target The target array to have duplicates remove from
	 * @returns {Array} The cleaned array with no duplicate values
	 * @private
	 */
	function unique(target) {
		var a = [],
			l = target.length,
			j = null,
			i = null;
		
		for(i = 0; i < l; i++) {
			for(j = i + 1; j < l; j++) {
				if(target[i] === target[j]) {
					j = ++i;
				}
			}
			
			a.push(target[i]);
		}
		return a;
	}
	
	/**
	 * Splits CSS selectors with quotes in mind
	 * 
	 * @param {String} selector The CSS selector string (without commas, just spaces)
	 * @returns {Array} The array of selectors
	 * @private
	 */
	function splitSelector(selector) {
		// Initialise any required variables
		var i = null,
			split = [],
			points = [],
			inString = false;
		
		// Loop through all of the characters
		for(i = 0; i < selector.length; i++) {
			// If we find a quote then toggle inString
			if(selector.indexOf('\'', i) === i || selector.indexOf('"', i) === i) {
				if(inString === true) {
					inString = false;
				}
				else if(inString === false) {
					inString = true;
				}
			}
			else if(selector.indexOf(' ', i) === i && inString === true) {
				// So we are in a string, we have a space, log its location
				points.push(i);
			}
		}
		
		// Loop through all the points replacing the spaces
		for(i = 0; i < points.length; i++) {
			selector = selector.substr(0, points[i] + i) + '\\s' + selector.substr(points[i] + 1 + i);
		}
		
		// Split the string
		split = selector.split(/\s+/g);
		
		// Loop through the split unescaping the string
		for(i = 0; i < split.length; i++) {
			split[i] = split[i].replace(/\\s/g, ' ');
		}
		
		// Return the split selector
		return split;
	}
	
	/**
	 * Turns a node list into an array
	 * 
	 * @param {NodeList} list The node list you wish to be converted
	 * @returns {Array} The array version of the NodeList
	 * @private
	 */
	function toArray(list) {
		// Initialise any required variables
		var i = null,
			built = [];
		
		// Loop through the passed nodes adding them to the array
		for(i = 0; i < list.length; i++) {
			built.push(list[i]);
		}
		
		// Return the found elements
		return built;
	}
	
	/**
	 * Takes a string, breaks it down into its components and uses them to run the find function
	 * 
	 * @param {String} selector The selector string
	 * @param {Object} offset The instance of Spark already containing elements
	 * @returns {Object} An instance of Spark containing all of the found elements
	 * @private
	 */
	function parseSelector(selector, offset) {
		// Initialise any required variables
		var selectors = selector.split(/\s*,\s*/g),
			paths = null,
			built = Spark.clone(),
			i = null,
			p = null,
			path = null,
			found = [],
			parameters = null,
			tempFound = null,
			regexs = [
				'^\\[([a-z_][\\-a-z0-9_]+)=[\'"](.*)[\'"]\\]', // Attribute comparison
				'^\\[([a-z_][\\-a-z0-9_]+)\\]', // Has attribute
				'^([a-z0-9*]+)', // Tag name comparison
				'^#([a-z][a-z0-9-_]*)', // ID comparison
				'^\\.(-?[_a-z]+[_a-z0-9\\-]*)', // Class comparison
				'^\\[([a-z_][\\-a-z0-9_]+)~=[\'"](.*)[\'"]\\]', // Whitespace seperated attribute
				'^\\[([a-z_][\\-a-z0-9_]+)\\|=[\'"](.*)[\'"]\\]', // Beginning of attribute with optional hyphen after
				'^:first-child', // Element must be the first child of it's parent
				'^:lang\\((.*)\\)' // Element is decendent of an element with the specified lang
			],
			finders = [];
		
		// Set up all the RegExps
		for(i = 0; i < regexs.length; i++) {
			finders.push({
				search: new RegExp(regexs[i], 'i'),
				remove: new RegExp(regexs[i] + '.*', 'i')
			});
		}
		
		// Loop through the selectors
		for(i = 0; i < selectors.length; i++) {
			// Grab the paths
			paths = splitSelector(selectors[i].replace(/(>|\+)/g, " $1 ").replace(/\s+(>|\+)\s+/g, " $1"));
			
			// Reset the parameters
			parameters = [];
			
			// Loop through all the paths
			for(p = 0; p < paths.length; p++) {
				// Grab the path
				path = paths[p];
				
				// Add the new object
				parameters.push({});
				
				// Keep looping until the string is gone
				while(path.length > 0) {
					// Check if it is a direct child selector or direct sibling
					if(path.indexOf('>') === 0) {
						parameters[p].child = true;
						path = path.substr(1);
					}
					else if(path.indexOf('+') === 0) {
						parameters[p].sibling = true;
						path = path.substr(1);
					}
					
					// Do the checks
					if(path.match(finders[5].search)) {
						// Check if element has whitespace seperated attribute
						// Make sure the object exists
						if(typeof parameters[p].whiteSpaceAttribute === 'undefined') {
							parameters[p].whiteSpaceAttribute = {};
						}
						
						// Add the check
						parameters[p].whiteSpaceAttribute[path.replace(finders[5].remove, "$1")] = path.replace(finders[5].remove, "$2");
						
						// Remove the selection
						path = path.replace(finders[5].search, '');
					}
					else if(path.match(finders[6].search)) {
						// Check if element attribute begins with a string, potentially followed by a hyphen
						// Make sure the object exists
						if(typeof parameters[p].hyphenAttribute === 'undefined') {
							parameters[p].hyphenAttribute = {};
						}
						
						// Add the check
						parameters[p].hyphenAttribute[path.replace(finders[6].remove, "$1")] = path.replace(finders[6].remove, "$2");
						
						// Remove the selection
						path = path.replace(finders[6].search, '');
					}
					else if(path.match(finders[0].search)) {
						// Check if element has attribute
						// Make sure the object exists
						if(typeof parameters[p].attribute === 'undefined') {
							parameters[p].attribute = {};
						}
						
						// Add the check
						parameters[p].attribute[path.replace(finders[0].remove, "$1")] = path.replace(finders[0].remove, "$2");
						
						// Remove the selection
						path = path.replace(finders[0].search, '');
					}
					else if(path.match(finders[1].search)) {
						// Check if element has attribute
						// Make sure the object exists
						if(typeof parameters[p].attribute === 'undefined') {
							parameters[p].attribute = {};
						}
						
						// Add the check
						parameters[p].attribute[path.replace(finders[1].remove, "$1")] = true;
						
						// Remove the selection
						path = path.replace(finders[1].search, '');
					}
					else if(path.match(finders[2].search)) {
						// Element
						if(typeof parameters[p].tag === 'undefined') {
							parameters[p].tag = path.replace(finders[2].remove, "$1");
						}
						else {
							if(typeof parameters[p].tag === 'string') {
								parameters[p].tag = [parameters[p].tag];
							}
							
							parameters[p].tag.push(path.replace(finders[2].remove, "$1"));
						}
						
						// Remove the selection
						path = path.replace(finders[2].search, '');
					}
					else if(path.match(finders[3].search)) {
						// ID
						if(typeof parameters[p].id === 'undefined') {
							parameters[p].id = path.replace(finders[3].remove, "$1");
						}
						else {
							if(typeof parameters[p].id === 'string') {
								parameters[p].id = [parameters[p].id];
							}
							
							parameters[p].id.push(path.replace(finders[3].remove, "$1"));
						}
						
						// Remove the selection
						path = path.replace(finders[3].search, '');
					}
					else if(path.match(finders[4].search)) {
						// Class
						if(typeof parameters[p].classes === 'undefined') {
							parameters[p].classes = path.replace(finders[4].remove, "$1");
						}
						else {
							if(typeof parameters[p].classes === 'string') {
								parameters[p].classes = [parameters[p].classes];
							}
							
							parameters[p].classes.push(path.replace(finders[4].remove, "$1"));
						}
						
						// Remove the selection
						path = path.replace(finders[4].search, '');
					}
					else if(path.match(finders[7].search)) {
						// First child
						parameters[p].first = true;
						
						// Remove the selection
						path = path.replace(finders[7].search, '');
					}
					else if(path.match(finders[8].search)) {
						// First child
						parameters[p].lang = path.replace(finders[8].remove, "$1");
						
						// Remove the selection
						path = path.replace(finders[8].search, '');
					}
					else {
						// If it does not match anything return false to stop endless loops
						return false;
					}
				}
			}
			
			// So now we have an array of parameter objects
			// Set up temp found to search with
			tempFound = offset;
			
			// Loop through all of the parameter objects
			for(p = 0; p < parameters.length; p++) {
				// Now do the search into tempFound
				tempFound = tempFound.find(parameters[p]);
			}
			
			// When done concat these results to the found array
			found = found.concat(tempFound.elements);
		}
		
		// Clean the array
		found = unique(found);
		
		// Loop through the found adding them to the object
		for(i = 0; i < found.length; i++) {
			built[i] = found[i];
		}
		
		// Add the array version
		built.elements = found;
		
		// Add the length
		built.length = found.length;
		
		// Return the built object
		return built;
	}
	
	/**
	 * Compare the value of a tag or ID to an array or string of comparisons
	 * 
	 * @param {String|Array} value Either an ID, an array of classes or a tag name to compare
	 * @param {String|Array} compare The string or array of values to check against
	 * @param {Boolean} tag If true, the values are converted to uppercase on comparison
	 * @param {Boolean} space If true, the values are whitespace seperated before comparison
	 * @param {Boolean} hyphen If true, the value must exactly match or start with followed by a hyphen
	 * @returns {Boolean} Returns true if it can not be compared or if they match
	 * @private
	 */
	function compareValue(value, compare, tag, space, hyphen) {
		// Initialise any required variables
		var i = null,
			e = null,
			classes = ((value instanceof Array) ? value.join(' ') : false);
		
		// Check what type of search we need to do
		if(typeof compare === 'string') {
			// Compare the two strings
			if(classes) {
				if(classes.match(new RegExp('(^| )' + compare + '($| )', 'g'))) {
					return true;
				}
				else {
					return false;
				}
			}
			else {
				if(((tag) ? value.toUpperCase() : value) === ((tag) ? compare.toUpperCase() : compare)) {
					return true;
				}
				else {
					if(tag && compare === '*') {
						return true;
					}
					
					return false;
				}
			}
		}
		else if(compare instanceof Array) {
			// Loop through and compare
			for(i = 0; i < compare.length; i++) {
				if(classes) {
					if(classes.match(new RegExp('(^| )' + compare[i] + '($| )', 'g'))) {
						return true;
					}
				}
				else {
					if(((tag) ? value.toUpperCase() : value) === ((tag) ? compare[i].toUpperCase() : compare[i])) {
						return true;
					}
				}
			}
			
			// Default to returning false
			return false;
		}
		else if(typeof compare === 'object') {
			// It is an object of attributes, loop through and compare
			// If any do not match, return false
			for(i in compare) {
				// Make sure it has the property and so does the object
				if(compare.hasOwnProperty(i)) {
					// If it is true then all we have to do is see if it exists
					if(compare[i] === true) {
						// So now if it has the attribute then continue
						if(value.getAttribute(i) === null) {
							// It doesnt
							return false;
						}
					}
					else {
						// So now we check if it has the value again, if it does we compare
						if(value.getAttribute(i) !== null) {
							// It does, check what it is
							if(typeof compare[i] === 'string') {
								if(hyphen) {
									if(value.getAttribute(i) !== compare[i] && value.getAttribute(i).indexOf(compare[i] + '-') !== 0) {
										return false;
									}
								}
								else if(space) {
									if(value.getAttribute(i) !== compare[i] && value.getAttribute(i).indexOf(compare[i] + ' ') !== 0) {
										return false;
									}
								}
								else {
									if(value.getAttribute(i) !== compare[i]) {
										return false;
									}
								}
							}
							else if(compare[i] instanceof Array) {
								// It is an or statement, so we need do a special check
								for(e = 0; e < compare[i].length; e++) {
									if(hyphen) {
										if(value.getAttribute(i) !== compare[i][e] && value.getAttribute(i).indexOf(compare[i][e] + '-') !== 0) {
											return false;
										}
									}
									else if(space) {
										if(value.getAttribute(i) !== compare[i][e] && value.getAttribute(i).indexOf(compare[i][e] + ' ') !== 0) {
											return false;
										}
									}
									else {
										if(value.getAttribute(i) !== compare[i][e]) {
											return false;
										}
									}
								}
							}
						}
						else {
							// It doesnt
							return false;
						}
					}
				}
			}
			
			// Default to returning true
			return true;
		}
		else {
			// Default to returning true
			return true;
		}
	}
	
	/**
	 * Check if the element has inherited the specified lang attribute
	 * 
	 * @param {Array} elements A list of elements to check the lang attributes of
	 * @param {String} lang The lang you wish to check for
	 * @returns {Array} The array of elements that inherit the specified lang
	 * @private
	 */
	function checkLang(elements, lang) {
		// Initialise any required variables
		var e = null,
			found = [],
			i = null;
		
		// Loop through all the elements
		for(i = 0; i < elements.length; i++) {
			// Grab the current element
			e = elements[i];
			
			// Keep looping up the dom til we can loop no more
			while(e.parentNode) {
				if(e.getAttribute('lang') === lang) {
					found.push(elements[i]);
					break;
				}
				
				e = e.parentNode;
			}
		}
		
		// Return the found elements
		return found;
	}
	
	/**
	 * Find elements from a context
	 * 
	 * @param {String} tag The name of the tag you wish to find
	 * @param {Object} ctx The context you wish to search in
	 * @param {Boolean} child Only find direct children
	 * @param {Boolean} sibling Only find the next sibling element
	 * @param {Boolean} first Only find elements that are the first child
	 * @param {String} lang Only find elements that are under the specified lang
	 * @returns {Array} Returns an array of the found elements
	 * @private
	 */
	function findElements(tag, ctx, child, sibling, first, lang) {
		// Initialise any required variables
		var tempFound = null,
			found = [];
		
		// Check what the tag filter is
		if(typeof tag === 'string') {
			// Perform a basic tag search
			tempFound = (sibling === true) ? ctx.parentNode.getElementsByTagName(tag) : ctx.getElementsByTagName(tag);
			
			// Loop through the elements
			for(e = 0; e < tempFound.length; e++) {
				// Push the found element to found
				// Check if it needs to be the first child
				if(first === true && tempFound[e] === (tempFound[e].parentNode.firstElementChild || tempFound[e].parentNode.firstChild)) {
					// And check if it is a direct child if we need to
					if(child === true && tempFound[e].parentNode === ctx) {
						found.push(tempFound[e]);
					}
					else if(sibling === true && (tempFound[e] === ctx.nextElementSibling || tempFound[e] === ctx.nextSibling)) {
						found.push(tempFound[e]);
					}
					else if(!child && !sibling) {
						found.push(tempFound[e]);
					}
				}
				else if(!first) {
					// And check if it is a direct child if we need to
					if(child === true && tempFound[e].parentNode === ctx) {
						found.push(tempFound[e]);
					}
					else if(sibling === true && (tempFound[e] === ctx.nextElementSibling || tempFound[e] === ctx.nextSibling)) {
						found.push(tempFound[e]);
					}
					else if(!child && !sibling) {
						found.push(tempFound[e]);
					}
				}
			}
			
			if(lang) {
				// Return the filtered array
				return checkLang(found, lang);
			}
			else {
				// Return the filtered array
				return found;
			}
		}
		else if(tag instanceof Array) {
			// Perform a looping tag search
			for(i = 0; i < tag.length; i++) {
				// Search into the temporary location
				tempFound = (sibling === true) ? ctx.parentNode.getElementsByTagName(tag[i]) : ctx.getElementsByTagName(tag[i]);
				
				// Loop through the elements
				for(e = 0; e < tempFound.length; e++) {
					// Push the found element to found
					// And check if it is a direct child if we need to
					if(child === true && tempFound[e].parentNode === ctx) {
						found.push(tempFound[e]);
					}
					else if(sibling === true && (tempFound[e] === ctx.nextElementSibling || tempFound[e] === ctx.nextSibling)) {
						found.push(tempFound[e]);
					}
					else if(!child && !sibling) {
						found.push(tempFound[e]);
					}
				}
			}
			
			if(lang) {
				// Return the filtered array
				return checkLang(found, lang);
			}
			else {
				// Return the filtered array
				return found;
			}
		}
		else {
			// Default to grabbing all tags
			tempFound = (sibling === true) ? ctx.parentNode.getElementsByTagName('*') : ctx.getElementsByTagName('*');
			
			// Loop through the elements
			for(e = 0; e < tempFound.length; e++) {
				// Push the found element to found
				// And check if it is a direct child if we need to
				if(child === true && tempFound[e].parentNode === ctx) {
					found.push(tempFound[e]);
				}
				else if(sibling === true && (tempFound[e] === ctx.nextElementSibling || tempFound[e] === ctx.nextSibling)) {
					found.push(tempFound[e]);
				}
				else if(!child && !sibling) {
					found.push(tempFound[e]);
				}
			}
			
			if(lang) {
				// Return the filtered array
				return checkLang(found, lang);
			}
			else {
				// Return the filtered array
				return found;
			}
		}
	}
	
	// Check if this is part of the chain
	if(this.elements instanceof Array) {
		// Find from the previously found
		// Loop through the elements
		for(i = 0; i < this.length; i++) {
			tempFound = findElements(parameters.tag, this.elements[i], parameters.child, parameters.sibling, parameters.first, parameters.lang);
			
			// Loop through the elements
			for(e = 0; e < tempFound.length; e++) {
				// Push the found element to found
				found.push(tempFound[e]);
			}
		}
	}
	else {
		// Find from scratch
		found = findElements(parameters.tag, ctx, parameters.child, parameters.sibling, parameters.first, parameters.lang);
	}
	
	// Check if parameters is a string
	if(typeof parameters === 'string') {
		// If so, then return what is found by the parse selector function
		return parseSelector(parameters, this);
	}
	
	// Loop through all elements
	for(i = 0; i < found.length; i++) {
		// Grab the current element
		e = found[i];
		
		// Get the classes of the element
		classes = e.className.split(/\s+/g);
		
		// Check if the element matches
		if(
			compareValue(e.nodeName, parameters.tag, true) &&
			compareValue(classes, parameters.classes) &&
			compareValue(e.id, parameters.id) &&
			compareValue(e, parameters.attribute) &&
			compareValue(e, parameters.whiteSpaceAttribute, false, true) &&
			compareValue(e, parameters.hyphenAttribute, false, false, true)
			) {
			// Add the found element to the filtered array
			filtered.push(e);
		}
	}
	
	// Clean the array
	filtered = unique(filtered);
	
	// Loop through the filtered adding them to the object
	for(i = 0; i < filtered.length; i++) {
		built[i] = filtered[i];
	}
	
	// Add the array version
	built.elements = filtered;
	
	// Add the length
	built.length = filtered.length;
	
	// Check if there is a find parameter
	if(typeof parameters.find === 'object') {
		// Refind with the passed parameters
		built = built.find(parameters.find);
	}
	
	// Return the object with all the elements within it
	return built;
});
/**
 * Loops through all of the elements contained in the Spark object passing them to a specified callback function.
 * You can also pass an array or object as the second argument and it will loop through that instead.
 * 
 * This basically handles looping for you, if you pass it an object then it will perform a `hasOwnProperty` check before passing it to your callback function.
 * 
 * To loop through all of the p tags on the page and turn them red, you would use the following code.
 * 
 *     $('p').each(function(e) {
 *         e.style.color = '#FF0000';
 *     });
 * 
 * To loop through an array or object you just pass the variable in question to the each function as the second argument. Here is an example of passing an array.
 * 
 *     Spark.each(function(e, i) {
 *         console.log(i + ': ' + e);
 *     }, ['hello', 'world']);
 * 
 * As you can see, a second argument is passed to your callback containing the current key
 * 
 * @param {Function} fn Function for the current element to be passed to
 * @param {Array|Object} data Optional data to be looped over, if not passed then it uses the elements
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('each', function(fn, data) {
	// Initialise any required variables
	var i = null,
		target = null;
	
	// Check if there is any data
	if(typeof data === 'undefined') {
		// Theres no data, check for elements
		if(typeof this.elements === 'undefined') {
			// There is nothing to use, return false
			return false;
		}
		else {
			// There are some elelements, assign it to target
			target = this.elements;
		}
	}
	else if(typeof data === 'object') {
		// We have data! Assign it to target
		target = data;
	}
	
	// Check if target is like an array or object
	if(typeof target.length === 'number') {
		// Loop through as an array
		for(i = 0; i < target.length; i++) {
			fn(target[i], i);
		}
	}
	else {
		// Loop through as an object
		for(i in target) {
			if(target.hasOwnProperty(i) === true) {
				fn(target[i], i);
			}
		}
	}
	
	// Return the Spark object for chaining
	return this;
});
/**
 * This is used to store the keys and data
 * 
 * @private
 */
Spark.extend('dataMeta', {
	keys: [],
	data: []
});

/**
 * The data function assigns data to the first element returned by find. It does not add anything to the actual element object but stores references in keys.
 * To assign data to an element simply select an element and call the data function with the name and data arguments, like so.
 * 
 *     // You can use the Spark.find(...) or $(...)
 *     // $ is just an alias
 *     $('p').data('foo', 'bar');
 * 
 * You can retrieve that data by using the same line, just without the data you wish to assign. The function either returns the assigned data or false if something is not found.
 * 
 *     $('p').data('foo'); // Returns 'bar'
 * 
 * @param {String} name The name of the data you wish to get or set
 * @param {Mixed} data The data you wish to assign, if not provided then the data is returned
 * @returns {Mixed} If it fails, it will return false, if it succeeds it will return the Spark object for chaining. If it succeeds in finding data it will return that data
 */
Spark.extend('data', function(name, data) {
	// Initialise any required variables
	var i = null,
		e = null,
		target = null,
		found = null;
	
	// Check that we have an element to work with
	if(this.elements instanceof Array) {
		if(typeof this.elements[0] === 'object') {
			// Grab the element
			e = this.elements[0];
			
			// Start the target as false
			target = -1;
			
			// Check if we can use indexOf
			if(typeof this.dataMeta.keys.indexOf !== 'undefined') {
				target = this.dataMeta.keys.indexOf(e);
			}
			else {
				// Loop through all of the keys checking for our element
				for(i = 0; i < this.dataMeta.keys.length; i++) {
					if(this.dataMeta.keys[i] === e) {
						// Found it, assign it to the target
						target = i;
					}
				}
			}
			
			// Check if data was passed
			if(typeof data !== 'undefined') {
				// We have data
				// Check if we found an element
				if(target === -1) {
					// We did not, create it and set the target
					target = this.dataMeta.keys.length;
					this.dataMeta.keys.push(e);
					this.dataMeta.data.push({});
				}
				
				// Assign the data
				this.dataMeta.data[target][name] = data;
				
				// Return the Spark object to allow chaining
				return this;
			}
			else {
				// We do not have data
				// Check if we found an element
				if(target === -1) {
					// We did not, return false
					return false;
				}
				
				// We now return the found data
				return (typeof this.dataMeta.data[target][name] !== 'undefined') ? this.dataMeta.data[target][name] : false;
			}
		}
	}
	
	// Return false because there is nothing to use
	return false;
});
/**
 * The attribute function is used to get or set attributes.
 * It takes either one or two arguments, if you pass a name and a value like so.
 * 
 *     $('img').attribute('alt', 'An image');
 * 
 * Then it will assign 'An image' to the alt attribute of all img tags on the page.
 * 
 * You can then retrieve the alt value of the first image on the page like so.
 * 
 *     $('img').attribute('alt');
 * 
 * If you have multiple values to set then you can use an object like so.
 * 
 *     $('img').attribute({
 *         alt: 'An image',
 *         title: 'Image title'
 *     });
 * 
 * @param {String|Object} name Either an object of attributes or the name of the required attribute
 * @param {String} value The value to assign to the name if you passed a string, if not passed then it returns the value of the previous name
 * @returns {Object|String} If you are setting it will return the Spark object for chaining, if you are getting then it will return the retrieved value
 */
Spark.extend('attribute', function(name, value) {
	// Set up that to put this in scope
	var that = this;
	
	// Check what kind of variable name is
	if(typeof name === 'string') {
		// Check if they passed a value
		if(typeof value === 'string') {
			// Loop through all elements and assign the attribute
			this.each(function(e) {
				e.setAttribute(name, value);
			});
		}
		else {
			// Get the attribute
			return this[0].getAttribute(name);
		}
	}
	else if(typeof name === 'object') {
		// Loop through all the attributes
		this.each(function(v, n) {
			// Loop through all elements and assign the attribute
			that.each(function(e) {
				e.setAttribute(n, v);
			});
		}, name);
	}
	
	// Return the Spark object to allow chaining
	return this;
});
/**
 * The style function is used to get or set styles.
 * It takes either one or two arguments, if you pass a name and a value like so.
 * 
 *     $('img').style('width', '100px');
 * 
 * Then it will make all images on the page 100px wide.
 * 
 * You can then retrieve the width of the first image on the page like so.
 * 
 *     $('img').style('width');
 * 
 * If you have multiple styles to set then you can use an object like so.
 * 
 *     $('img').style({
 *         width: '100px',
 *         height: '50px'
 *     });
 * 
 * @param {String|Object} name Either an object of styles or the name of the required style
 * @param {String} value The value to assign to the style if you passed a string, if not passed then it returns the style of the previous name
 * @returns {Object|String} If you are setting it will return the Spark object for chaining, if you are getting then it will return the retrieved style
 */
Spark.extend('style', function(name, value) {
	// Initialise any required variables
	var i = null,
		n = null,
		that = this,
		directions = null;
	
	/**
	 * Turns a hyphen seperated style name into a camel case one
	 * 
	 * @param {String} style The style name to convert
	 * @returns {String} The camel case version of the string
	 * @private
	 */
	function camelStyle(style) {
		// Check if we need to camel case
		if(style.indexOf('-') !== -1) {
			// Return the camel cased string
			return style.replace(/-([a-z])/gi, function(s, g1) {
				return g1.toUpperCase();
			});
		}
		
		// Default to returning the string back just as it was
		return style;
	}
	
	/**
	 * Turns a camelcase seperated style name into a hyphen one
	 * 
	 * @param {String} style The style name to convert
	 * @returns {String} The hyphen version of the string
	 * @private
	 */
	function hyphenStyle(style) {
		// Return the hyphen seperated string
		return style.replace(/([A-Z])/g, function($1) {
			return '-' + $1.toLowerCase();
		});
	}
	
	/**
	 * Sets the specified style with cross browser adjustments if necessary
	 * 
	 * @param {Object} element The element to alter
	 * @param {String} name The name of the style (can be camel case or hyphen separated)
	 * @param {String} value The value to set
	 * @private
	 */
	function setStyle(element, name, value) {
		// Initialise any required variables
		var pxNames = 'zIndex fontWeight opacity zoom lineHeight scrollTop scrollLeft',
			nameTest = null;
		
		// Assign the new regex and fix the name
		name = camelStyle(name);
		nameTest = new RegExp('(^|\\s)' + name + '($|\\s)', 'i');
		
		// Assign px to the value if required
		value = (typeof value === 'number' && !nameTest.test(pxNames)) ? value + 'px' : value;
		
		// Work around for scroll position
		if(name === 'scrollTop' || name === 'scrollLeft') {
			element[name] = value;
		}
		else {
			element.style[name] = value;
		}
		
		if(name === 'opacity') {
			element.style.zoom = '1';
			element.style.filter = 'alpha(opacity=' + (parseFloat(value) * 100) + ')';
			element.style.MozOpacity = value;
			element.style.KhtmlOpacity = value;
		}
	}
	
	/**
	 * Retrieves the specified computed style from the element
	 * 
	 * @param {Object} e Element object to get styles from
	 * @param {String} name The name of the computed style you require
	 * @returns {String} The computed style of the first element in the element list
	 */
	function getStyle(e, name) {
		// Initialise any required variables
		var style = null;
		
		// Work around for scroll position
		if(name === 'scrollTop' || name === 'scrollLeft') {
			return e[name];
		}
		
		// If we can use getComputedStyle
		if(typeof getComputedStyle !== 'undefined') {
			// Return getComputedStyle
			style = document.defaultView.getComputedStyle(e, null).getPropertyValue(hyphenStyle(name));
		}
		else {
			// Otherwise return currentStyle
			style = e.currentStyle[name];
		}
		
		// If not found, check the style property
		if(!style) {
			style = e.style[name];
		}
		
		// If it is still not found, set a default
		if(!style && style !== 0) {
			// If it is opacity, set it to 1, anything else, set it to 0
			if(name === 'opacity') {
				style = '1';
			}
			else {
				style = '0';
			}
		}
		
		// Fix colours
		if(name.toLowerCase().indexOf('color') !== -1) {
			style = that.color.toRgb(style);
		}
		
		// Return the found style, if not found then look in the style property
		return style;
	}
	
	// Check what kind of variable name is
	if(typeof name === 'string') {
		// Check if they passed a value
		if(typeof value === 'string' || typeof value === 'number') {
			// Loop through all elements and assign the style
			for(i = 0; i < this.length; i++) {
				setStyle(this[i], name, value);
			}
		}
		else {
			if(name === 'padding' || name === 'margin') {
				// Get the direction styles
				directions = [
					getStyle(this[0], camelStyle(name + 'Top')),
					getStyle(this[0], camelStyle(name + 'Bottom')),
					getStyle(this[0], camelStyle(name + 'Left'))
				];
				
				// Loop through the styles
				for(i = 1; i < 2; i++) {
					// Compare
					if(directions[0] !== directions[i]) {
						return '';
					}
				}
				
				// They match, return one of them
				return directions[0];
			}
			else {
				// Get the style
				return getStyle(this[0], camelStyle(name));
			}
		}
	}
	else if(typeof name === 'object') {
		// Loop through all the styles
		for(n in name) {
			// Check that it is not a prototype
			if(name.hasOwnProperty(n)) {
				// Loop through all elements and assign the style
				for(i = 0; i < this.length; i++) {
					setStyle(this[i], n, name[n]);
				}
			}
		}
	}
	
	// Return the Spark object to allow chaining
	return this;
});
/**
 * The JSON object can stringify or parse JSON.
 * 
 * To parse a JSON string back into its respective object / array / string etc, simply use the following line. Where `json` equals your JSON string.
 * 
 *     var parsed = Spark.json.parse(json);
 * 
 * This will then return what ever is contained in the JSON string. If the string is invalid then it will throw an `Invalid JSON` syntax error.
 * 
 * To turn the parsed data back into a JSON string you can use the following line.
 * 
 *     Spark.json.stringify(parsed);
 */

/** @private */
Spark.extend('json', {
    /**
     * Checks that the string is valid JSON and then parses it.
     * On error, it will throw a 'Invalid JSON' syntax error
     * 
     * @param {String} json The JSON string that you want to parse
     * @returns {Mixed} Will return the parsed data on success
     */
	parse: function(json) {
		// Check if we can use native method
		if(typeof JSON !== 'undefined') {
			try {
				// Try to parse the JSON
				return JSON.parse(json);
			}
			catch(err) {
				// Parsing failed throw an error
				throw new SyntaxError('Invalid JSON');
			}
		}
		
		// Check that the JSON string is okay
		if(/^[\],:{}\s]*$/.test(json.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
			.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
			.replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
			// It is, parse and return
		    return eval('(' + json + ')');
		}
		else {
			// It is not, throw an error
			throw new SyntaxError('Invalid JSON');
		}
	},
	
    /**
     * Turns a mixed variable into a JSON string
     * 
     * @param {Mixed} data The mixed variable to encode
     * @param {String} key An optional key for encoding objects, used internally
     * @returns {String} The JSON string
     */
	stringify: function(data, key) {
		// Initialise any required variables
		var i = null,
			built = '',
			 meta = {
				'\b': '\\b',
				'\t': '\\t',
				'\n': '\\n',
				'\f': '\\f',
				'\r': '\\r',
				'"' : '\\"',
				'\\': '\\\\'
			},
			escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
		
		// Check if we can use native method
		if(typeof JSON !== 'undefined') {
			return JSON.stringify(data);
		}
		
		/**
		 * Returns the JSON correctly
		 * 
		 * @param {String} str The JSON string
		 * @returns {String} The correct JSON string with keys included if required
		 * @private
		 */
		function ret(str) {
			return (key) ? '"' + key + '":' + str : str;
		}
		
		/**
		 * Escapes certain characters out of the string
		 * 
		 * @param {String} string The string with characters that need to be escaped
		 * @returns {String} The escaped string
		 * @private
		 */
		function esc(string) {
			// Escape characters
			escapable.lastIndex = 0;
			return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
				var c = meta[a];
				return typeof c === 'string' ? c :
				'\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
			}) + '"' : '"' + string + '"';
		}
		
		// Check what it is
		if(data instanceof Array) {
			// Loop through the array
			for(i = 0; i < data.length; i++) {
				built += this.stringify(data[i]) + ',';
			}
			
			return ret('[' + built.slice(0, built.length - 1) + ']');
		}
		else if(typeof data === 'object') {
			// Loop through the object
			for(i in data) {
				// Check the value is not a prototype
				if(data.hasOwnProperty(i)) {
					built += this.stringify(data[i], i) + ',';
				}
			}
			
			return ret('{' + built.slice(0, built.length - 1) + '}');
		}
		else if(typeof data === 'string') {
			// Return the string
			return ret(esc(data));
		}
		else {
			// Return anything else (numbers, booleans etc) as a string
			return ret(data.toString());
		}
	}
});
/**
 * Checks if an element has the specified class.
 * 
 * For example, this will return true, given that there is a div with a class of focus on the page.
 * 
 *     $('div.focus').hasClass('focus');
 * 
 * @param {String} name The class name you want to search for
 * @returns {Boolean} Will return true if it has the class or false if it does not
 */
Spark.extend('hasClass', function(name) {
	// Check for the class
	return new RegExp('\\b' + name + '\\b').test(this[0].className);
});
/**
 * Add a class to the specified elements
 * 
 * This will add the class, border, to all the h1 tags on the page.
 * 
 *     $('h1').addClass('border');
 * 
 * @param {String} name The class name you want to add
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('addClass', function(name) {
	// Initialise any required variables
	var c = null,
		that = this;
	
	// Loop through all the elements
	this.each(function(e) {
		// Check if it already has the class
		if(!that.find(e).hasClass(name)) {
			// Grab the class
			c = that.find(e).attribute('class');
			
			// It doesnt, add it and trim off whitespace
			e.className = ((c) ? c + ' ' + name : name).replace(/^\s+|\s+$/i, '');
		}
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Remove a class from the specified elements
 * 
 * This will remove the class, border, from all the h1 tags on the page.
 * 
 *     $('h1').removeClass('border');
 * 
 * @param {String} name The class name you want to remove
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('removeClass', function(name) {
	// Loop through all the elements
	this.each(function(e) {
		// Remove the class
		e.className = e.className.replace(new RegExp('(^|\\s)' + name + '($|\\s)'), '');
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Add an event listener to the found elements.
 * 
 * To set an event you must specify an event type and callback. The callback will be passed the event object as an argument.
 * 
 * If you wanted to set a listener for click event on all p tags then you would use the following line.
 * 
 *     $('p').addEvent('click', function(e) {
 *         // Code to handle the click event goes here
 *     });
 * 
 * If you return false from your callback then the default action will be prevented. For instance, this line would cause all links on the page to stop working.
 * 
 *     $('a').addEvent('click', function(e) { return false });
 * 
 * The function also takes an optional third argument, `stopBubble`.
 * 
 * If true then event bubbling will be prevented.
 * 
 * @param {String} type Name of the event you want to listen for
 * @param {Function} fn Function to be run when the event occurs
 * @param {Boolean} stopBubble If true then event bubbling will be prevented
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('addEvent', function(type, fn, stopBubble) {
	// Initialise any required variables
	var that = this;
	
	function fixEvent(e) {
		// Initialise any required variables
		var posx = 0,
			posy = 0,
			obj = null,
			offsetX = 0,
			offsetY = 0;
		
		// Fix IE's wrong association of the target element
		if(typeof e.target === 'undefined') {
			e.target = e.srcElement;
		}
		
		// Fix Safaris problem with selecting the wrong node type
		if(e.target.nodeType === 3) {
			e.target = e.target.parentNode;
		}
		
		// Make sure we have keyCode, and not which
		if(typeof e.keyCode === 'undefined') {
			e.keyCode = e.which;
		}
		
		// Fix IE's pageX/Y locations
		if(typeof e.pageX === 'undefined') {
			e.pageX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			e.pageY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
		
		// Fix the offsetX/Y in Firefox
		obj = e.target;
		if(obj.offsetParent && navigator.userAgent.indexOf('Opera') === -1 && navigator.userAgent.indexOf('MSIE') === -1) {
			do {
				obj = obj.offsetParent;
				offsetX += obj.offsetLeft;
				offsetY += obj.offsetTop;
			} while(obj.offsetParent);
			
			e.offsetX = offsetX;
			e.offsetY = offsetY;
		}
		
		// Return the fixed event object
		return e;
	}
	
	function runCallback(e) {
		// Stop bubbling if required
		if(stopBubble) {
			e.cancelBubble = true;
			if(e.stopPropagation) {
				e.stopPropagation();
			}
		}
		
		// Run the callback and check if it returned false
		if(fn(fixEvent(e)) === false) {
			// If so then prevent default
			if(e.preventDefault) {
				e.preventDefault();
			}
			else {
				e.returnValue = false;
			}
		}
	}
	
	// Loop through all the elements
	this.each(function(e) {
		// Make sure it has an events array
		if(!that.find(e).data('SparkEvents')) {
			that.find(e).data('SparkEvents', []);
		}
		
		// Assign the events data to the array
		that.find(e).data('SparkEvents').push({
			type: type,
			fn: fn,
			reference: runCallback
		});
		
		// Check if the browser supports addEventListener or attachEvent and use it
		if(e.addEventListener) {
			// Assign event
			e.addEventListener(type, runCallback, false);
		}
		else {
			// Assign event
			e.attachEvent('on' + type, runCallback);
		}
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Remove an event listener from the found elements.
 * 
 * Here is an example of removing the listener for a click event from all p tags.
 * 
 *     $('p').removeEvent('click', myFunction);
 * 
 * `myFunction` must contain a reference to the function you originally passed to the `addEvent` function.
 * 
 * This will not work with anonymous functions.
 * 
 * @param {String} type Name of the event you want to remove
 * @param {Function} fn Reference to the function which you previously passed
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('removeEvent', function(type, fn) {
	// Initialise any required variables
	var found = null,
		that = this;
	
	// Loop through all of the elements
	this.each(function(e) {
		// Check we have events
		if(that.find(e).data('SparkEvents')) {
			// Loop through the events until we find one
			that.each(function(r) {
				if(r.fn === fn && r.type === type) {
					// Found it! Remove the event in the appropriate way
					if(e.removeEventListener) {
						e.removeEventListener(type, r.reference, false);
					}
					else {
						e.detachEvent('on' + type, r.reference);
					}
				}
			}, that.find(e).data('SparkEvents'));
		}
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Manually fire events assigned to elements
 * 
 * For example, to trigger a click event on all p elements you would use the following line
 * 
 *     $('p').triggerEvent('click');
 * 
 * @param {String} type Name of the event you wish to trigger
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('triggerEvent', function(type) {
	// Initialise any required variables
	var trigger = null;
	
	// Loop through all of the elements
	this.each(function(e) {
		// Check for createEventObject
		if(document.createEventObject) {
			// Trigger for Internet Explorer
			trigger = document.createEventObject();
			e.fireEvent('on' + type, trigger);
		}
		else {
			// Trigger for the good browsers
			trigger = document.createEvent('HTMLEvents');
			trigger.initEvent(type, true, true);
			e.dispatchEvent(trigger);
		}
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Creates an element from the passed parameters
 * 
 * To create a basic element such as a p tag, all you need to provide is a tag name.
 * 
 *     Spark.createElement('p');
 * 
 * And the new p tag object will be returned.
 * 
 * If you wanted to assign a class and title to this element, you pass the attribute assigning object as the second argument.
 * 
 *     Spark.createElement('p', {
 *         class: 'someClass',
 *         title: 'Some title'
 *     });
 * 
 * You can also style the element with the third argument.
 * 
 *     Spark.createElement('p', {
 *         class: 'someClass',
 *         title: 'Some title'
 *     }, {
 *         'background-color': '#FF0000'
 *     });
 * 
 * @param {String} name Name of the node you wish to create
 * @param {String|Boolean} html The inner html of the element
 * @param {Object|Boolean} attributes Attributes to assign to the element
 * @param {Object|Boolean} styles Styles to assign to the element
 * @returns {Object} The created element
 */
Spark.extend('createElement', function(name, html, attributes, styles) {
	// Create the new element
	var built = document.createElement(name);
	
	// Assign the inner html if required
	if(html) {
		built.innerHTML = html;
	}
	
	// Assign the attributes if required
	if(attributes) {
		this.find(built).attribute(attributes);
	}
	
	// Assign the styles if required
	if(styles) {
		this.find(built).style(styles);
	}
	
	// Return the built element
	return built;
});
/**
 * Inserts a new element into the specified elements
 * 
 * You can pass an already created element from the createElement function or pass the parameters for a new one. Like so.
 * 
 *     $('p').insertElement('p', 'Hello, World!', {
 *         class: 'someClass',
 *         title: 'Some title'
 *     }, {
 *         'background-color': '#FF0000'
 *     });
 * 
 * Passing false for the html, attributes or styles will cause them to be ignored.
 * 
 * @param {String|Object} name Name of the node you wish to create or an already created element
 * @param {String|Boolean} html The inner html of the element
 * @param {Object|Boolean} attributes Attributes to assign to the element
 * @param {Object|Boolean} styles Styles to assign to the element
 * @returns {Object} The Spark object for chaining
 */
Spark.extend('insertElement', function(name, html, attributes, styles) {
	// Initialise any required variables
	var el = null;
	
	// Check if we need to create the new element
	if(typeof name === 'string') {
		el = this.createElement(name, html, attributes, styles);
	}
	else {
		el = name;
	}
	
	// Loop through the elements
	this.each(function(e) {
		e.appendChild(el.cloneNode(true));
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Inserts a new element before the specified elements
 * 
 * You can pass an already created element from the createElement function or pass the parameters for a new one. Like so.
 * 
 *     $('p').prependElement('p', 'Hello, World!', {
 *         class: 'someClass',
 *         title: 'Some title'
 *     }, {
 *         'background-color': '#FF0000'
 *     });
 * 
 * Passing false for the html, attributes or styles will cause them to be ignored.
 * 
 * @param {String|Object} name Name of the node you wish to create or an already created element
 * @param {String|Boolean} html The inner html of the element
 * @param {Object|Boolean} attributes Attributes to assign to the element
 * @param {Object|Boolean} styles Styles to assign to the element
 * @returns {Object} The Spark object for chaining
 */
Spark.extend('prependElement', function(name, html, attributes, styles) {
	// Initialise any required variables
	var el = null;
	
	// Check if we need to create the new element
	if(typeof name === 'string') {
		el = this.createElement(name, html, attributes, styles);
	}
	else {
		el = name;
	}
	
	// Loop through the elements
	this.each(function(e) {
		e.parentNode.insertBefore(el.cloneNode(true), e);
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Inserts a new element after the specified elements
 * 
 * You can pass an already created element from the createElement function or pass the parameters for a new one. Like so.
 * 
 *     $('p').appendElement('p', 'Hello, World!', {
 *         class: 'someClass',
 *         title: 'Some title'
 *     }, {
 *         'background-color': '#FF0000'
 *     });
 * 
 * Passing false for the html, attributes or styles will cause them to be ignored.
 * 
 * @param {String|Object} name Name of the node you wish to create or an already created element
 * @param {String|Boolean} html The inner html of the element
 * @param {Object|Boolean} attributes Attributes to assign to the element
 * @param {Object|Boolean} styles Styles to assign to the element
 * @returns {Object} The Spark object for chaining
 */
Spark.extend('appendElement', function(name, html, attributes, styles) {
	// Initialise any required variables
	var el = null;
	
	// Check if we need to create the new element
	if(typeof name === 'string') {
		el = this.createElement(name, html, attributes, styles);
	}
	else {
		el = name;
	}
	
	// Loop through the elements
	this.each(function(e) {
		e.parentNode.insertBefore(el.cloneNode(true), e.nextSibling);
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Removes the found elements
 * 
 * To remove all p tags on the page, you would use the following line
 * 
 *     $('p').removeElement();
 * 
 * @returns {Object} The Spark object for chaining
 */
Spark.extend('removeElement', function() {
	// Loop through the elements
	this.each(function(e) {
		e.parentNode.removeChild(e);
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Load external JavaScript files into the document
 * 
 * For example, to load a Spark plugin into the document you would use the following line.
 * 
 *     Spark.load('http://somesite/AwesomeSparkPlugin.js');
 * 
 * @param {String} file Path to the script you want to load
 */
Spark.extend('load', function(file) {
	// Add the script tag
	this.clone().find('head').insertElement('script', false, {
		type: 'text/javascript',
		src: file
	});
});
/**
 * Replace or append a html string to the specified elements
 * 
 * To replace the content of an element you just have to pass a replacement string, like so.
 * 
 *     $('p.someClass').html('Replaced');
 * 
 * If you pass true as the second argument then it will append the text.
 * 
 * If nothing is passed then it returns the first elements content.
 */
Spark.extend('html', function(content, append) {
	// Check if they just want the innerHTML
	if(typeof content === 'undefined') {
		return this[0].innerHTML;
	}
	
	// Loop through all the elements
	this.each(function(e) {
		// Append or replace the html
		if(append) {
			e.innerHTML += content;
		}
		else {
			e.innerHTML = content;
		}
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Replace or append text to the specified elements
 * 
 * To replace the content of an element you just have to pass a replacement string, like so.
 * 
 *     $('p.someClass').text('Replaced');
 * 
 * If you pass true as the second argument then it will append the text.
 * 
 * If nothing is passed then it returns the first elements content.
 */
Spark.extend('text', function(content, append) {
	// Initialise any required variables
	var type = (document.body.innerText) ? 'innerText' : 'textContent';
	
	// Check if they just want the text
	if(typeof content === 'undefined') {
		return this[0][type];
	}
	
	// Loop through all the elements
	this.each(function(e) {
		// Append or replace the text
		if(append) {
			e[type] += content;
		}
		else {
			e[type] = content;
		}
	});
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Animate styles of the specified elements
 * 
 * The minimal use of this function would be passing an object of animations like so
 * 
 *     $('p').animate({
 *         opacity: .5
 *     });
 * 
 * This will animate all p tags opacity to 0.5 over 600ms using the outQuad easing method.
 * 
 * You can pass a timeframe and easing like so.
 * 
 *     $('p').animate({
 *         opacity: .5
 *     }, 1000, 'inBounce');
 * 
 * This will obviously use inBounce as the easing method and will last for one second, or 1000 milliseconds.
 * 
 * You can also pass a callback function to be run when the animation completes like so.
 * 
 *     $('p').animate({
 *         opacity: .5
 *     }, 1000, 'inBounce', function() {
 *         console.log('Animation complete');
 *     });
 * 
 * If you pass false for the timeframe or easing then it will default to 600ms and outQuad.
 * 
 * If you chain animations then they will stack up. Even if it is called from a different chain then the animations will stack. For example, these animations will run one after another.
 * 
 *     $('p').animate({
 *         opacity: .5
 *     });
 *     
 *     $('p').animate({
 *         opacity: 1
 *     });
 * 
 * The following code will produce an identical outcome to the one above.
 * 
 *     $('p').animate({
 *         opacity: .5
 *     }).animate({
 *         opacity: 1
 *     });
 * 
 * @param {Object} style Name of the style you wish to animate and then what you want to animate to
 * @param {Number|Boolean} timeframe How many milliseconds you wish the animation to take, pass false to default to 600
 * @param {String|Boolean} easing The easing method to use either in, out or inOut followed by one of the following: Quad, Cubic, Quart, Quint, Sine, Expo, Circ, Elastic, Back or Bounce, pass false to default to outQuad. You can also use linear
 * @param {Function} callback Function to be run on completion of the animation
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('animate', function(animations, timeframe, easing, callback) {
	// Initialise any required variables
	var that = this,
		fps = 50,
		i = null,
		element = null,
		notUnit = /[\d\.\-]/g,
		stack = null,
		from = null,
		unit = null,
		calculated = null,
		difference = null,
		a = null,
		easingMethods = {
			inQuad: function (t, b, c, d) {
				return c*(t/=d)*t + b;
			},
			outQuad: function (t, b, c, d) {
				return -c *(t/=d)*(t-2) + b;
			},
			inOutQuad: function (t, b, c, d) {
				if ((t/=d/2) < 1) {
					return c/2*t*t + b;
				}
				return -c/2 * ((--t)*(t-2) - 1) + b;
			},
			inCubic: function (t, b, c, d) {
				return c*(t/=d)*t*t + b;
			},
			outCubic: function (t, b, c, d) {
				return c*((t=t/d-1)*t*t + 1) + b;
			},
			inOutCubic: function (t, b, c, d) {
				if ((t/=d/2) < 1) {
					return c/2*t*t*t + b;
				}
				return c/2*((t-=2)*t*t + 2) + b;
			},
			inQuart: function (t, b, c, d) {
				return c*(t/=d)*t*t*t + b;
			},
			outQuart: function (t, b, c, d) {
				return -c * ((t=t/d-1)*t*t*t - 1) + b;
			},
			inOutQuart: function (t, b, c, d) {
				if ((t/=d/2) < 1) {
					return c/2*t*t*t*t + b;
				}
				return -c/2 * ((t-=2)*t*t*t - 2) + b;
			},
			inQuint: function (t, b, c, d) {
				return c*(t/=d)*t*t*t*t + b;
			},
			outQuint: function (t, b, c, d) {
				return c*((t=t/d-1)*t*t*t*t + 1) + b;
			},
			inOutQuint: function (t, b, c, d) {
				if ((t/=d/2) < 1) {
					return c/2*t*t*t*t*t + b;
				}
				return c/2*((t-=2)*t*t*t*t + 2) + b;
			},
			inSine: function (t, b, c, d) {
				return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
			},
			outSine: function (t, b, c, d) {
				return c * Math.sin(t/d * (Math.PI/2)) + b;
			},
			inOutSine: function (t, b, c, d) {
				return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
			},
			inExpo: function (t, b, c, d) {
				return (t === 0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
			},
			outExpo: function (t, b, c, d) {
				return (t === d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
			},
			inOutExpo: function (t, b, c, d) {
				if(t === 0) {
					return b;
				}
				else if(t === d) {
					return b + c;
				}
				else if((t/=d/2) < 1) {
					return c/2 * Math.pow(2, 10 * (t - 1)) + b;
				}
				return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
			},
			inCirc: function (t, b, c, d) {
				return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
			},
			outCirc: function (t, b, c, d) {
				return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
			},
			inOutCirc: function (t, b, c, d) {
				if ((t/=d/2) < 1) {
					return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
				}
				return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
			},
			inElastic: function (t, b, c, d, a, p) {
				var s = null;
				if(t === 0) {
					return b;
				} 
				else if((t/=d) === 1) {
					return b+c;
				}
				if(!p) {
					p=d*0.3;
				}
				if(a < Math.abs(c)) {
					a=c;
					s=p/4;
				}
				else {
					a = Math.abs(c);
					s = p/(2*Math.PI) * Math.asin(c/a);
				}
				return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
			},
			outElastic: function (t, b, c, d, a, p) {
				var s = null;
				if(t === 0) {
					return b;
				}
				else if((t/=d) === 1) {
					return b+c;
				}
				else if (!p) {
					p=d*0.3;
				}
				if(a < Math.abs(c)) {
					a=c;
					s=p/4;
				}
				else {
					a=Math.abs(c);
					s= p/(2*Math.PI) * Math.asin (c/a);
				}
				return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
			},
			inOutElastic: function (t, b, c, d, a, p) {
				var s = null;
				if (t === 0) {
					return b;
				}
				else if ((t/=d/2) === 2) {
					return b+c;
				}
				else if (!p) {
					p=d*(0.3*1.5);
				}
				if (a < Math.abs(c)) {
					a=c;
					s=p/4;
				}
				else {
					a=Math.abs(c);
					s= p/(2*Math.PI) * Math.asin (c/a);
				}
				if (t < 1) {
					return -0.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
				}
				return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*0.5 + c + b;
			},
			inBack: function (t, b, c, d, s) {
				if(typeof s === 'undefined') {
					s = 1.70158;
				}
				return c*(t/=d)*t*((s+1)*t - s) + b;
			},
			outBack: function (t, b, c, d, s) {
				if (typeof s === 'undefined') {
					s = 1.70158;
				}
				return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
			},
			inOutBack: function (t, b, c, d, s) {
				if (typeof s === 'undefined') {
					s = 1.70158;
				}
				if ((t/=d/2) < 1) {
					return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
				}
				return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
			},
			inBounce: function (t, b, c, d) {
				return c - this.outBounce (d-t, 0, c, d) + b;
			},
			outBounce: function (t, b, c, d) {
				if ((t/=d) < (1/2.75)) {
					return c*(7.5625*t*t) + b;
				} 
				else if (t < (2/2.75)) {
					return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b;
				} 
				else if (t < (2.5/2.75)) {
					return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b;
				}
				else {
					return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b;
				}
			},
			inOutBounce: function (t, b, c, d) {
				if (t < d/2) {
					return this.inBounce (t*2, 0, c, d) * 0.5 + b;
				}
				return this.outBounce (t*2-d, 0, c, d) * 0.5 + c*0.5 + b;
			},
			linear: function(frame, original, change, frames) {
				return original + (frame * (change / frames));
			}
		};
	
	function doFrame(element, name, value, time) {
		// Set the timeout
		element.data('SparkTimeouts').push(setTimeout(function() {
			// Apply the style
			element.style(name, value);
		}, time));
	}
	
	function lastFrame(callback, element, time) {
		element.data('SparkTimeouts').push(setTimeout(function() {
			// Run the callback if it has been passed
			if(callback) {
				callback();
			}
			
			// Remove the animation object
			element.data('SparkAnimations').shift();
			
			// Recurse
			animate(element);
		}, time));
	}
	
	function animate(element) {
		// Grab the animation stack
		stack = element.data('SparkAnimations');
		
		// Make sure we have some animations
		if(stack.length > 0) {
			// Check if the first one is not running
			if(stack[0].running === false) {
				// It is not, we need to animate it, so copy the first stack into a
				a = stack[0];
				
				// Set running to true
				a.running = true;
				
				// Loop through the animations
				that.each(function(to, name) {
					// Get the unit
					if(typeof to === 'string') {
						unit = to.replace(notUnit, '');
					}
					else {
						unit = 0;
					}
					
					if(to instanceof Array) {
						// Get the from value
						from = that.color.toArray(element.style(name));
						
						// Work out the difference
						difference = [
							to[0] - from[0],
							to[1] - from[1],
							to[2] - from[2]
						];
					}
					else {
						// Get the from value
						from = parseFloat(element.style(name));
						
						// Get the to value
						to = parseFloat(to);
						
						// Work out the difference
						difference = to - from;
					}
					
					// Loop over all frames
					for(i = 1; i <= a.frames; i++) {
						// Work out the value
						if(to instanceof Array) {
							calculated = that.color.toRgb([
								Math.floor(easingMethods[a.easing](i, from[0], difference[0], a.frames)),
								Math.floor(easingMethods[a.easing](i, from[1], difference[1], a.frames)),
								Math.floor(easingMethods[a.easing](i, from[2], difference[2], a.frames))
							]);
						}
						else {
							calculated = easingMethods[a.easing](i, from, difference, a.frames) + unit;
						}
						
						doFrame(element, name, calculated, i * (1000 / fps));
					}
				}, a.animations);
				
				// Run the last frame
				lastFrame(a.callback, element, a.timeframe);
			}
		}
	}
	
	// Convert colors to arrays
	this.each(function(to, style) {
		// Check that it is a color
		if(style.toLowerCase().indexOf('color') !== -1) {
			// Convert it to an array
			animations[style] = that.color.toArray(to);
		}
	}, animations);
	
	// Loop through all elements
	this.each(function(e, count) {
		// Adopt the element into an instance
		element = that.find(e);
		
		// Make sure the element has an animations array
		if(element.data('SparkAnimations') === false) {
			element.data('SparkAnimations', []);
		}
		
		// Make sure the element has a timeouts array
		if(element.data('SparkTimeouts') === false) {
			element.data('SparkTimeouts', []);
		}
		
		// Get the timeframe with a default if required
		timeframe = (timeframe) ? timeframe : 600;
		
		// Push a new animation object into it
		element.data('SparkAnimations').push({
			animations: animations,
			timeframe: timeframe,
			frames: timeframe / (1000 / fps),
			easing: (easing) ? easing : 'outQuad',
			callback: (callback && count === that.length - 1) ? callback : false,
			running: false
		});
		
		// Call the animate function and pass the element
		animate(element);
	});
	
	// Return the Spark object
	return this;
});
/**
 * Hides all of the found elements
 * 
 * For example, to hide all p tags on the page, you would use the following line
 * 
 *     $('p').hide();
 * 
 * To fade the elements out, you would specify the fade transition as the optional argument
 * 
 *     $('p').hide('fade');
 * 
 * You can also pass a function as the second argument to be run when the transition completes, like so
 * 
 *     $('p').hide('fade', function() {
 *         alert('done');
 *     });
 * 
 * This function takes the originial display type into account.
 * 
 * @param {String} transition Optional name of the transition to use to hide. Default transitions are: fade, slide and smooth
 * @param {Function} callback Optional function to be run after the transition completes
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('hide', function(transition, callback) {
	// Initialise any required variables
	var that = this;
	
	// Check for a transition
	if(typeof transition === 'string') {
		// Hide it with the specified transition
		// Check for the transition
		if(typeof this.transitions.hide[transition] === 'function') {
			// Loop through all of the elements
			this.each(function(e) {
				// Run the transition
				that.transitions.hide[transition](that.find(e), callback);
			});
		}
		else {
			// If it does not exist, default to just hiding it
			this.hide();
		}
	}
	else {
		// Loop through all the elements
		this.each(function(e) {
			// Make sure it is already shown
			if(that.find(e).style('display') !== 'none') {
				// Store the original display type and hide the element
				that.find(e).data('SparkDisplayType', that.find(e).style('display')).style('display', 'none');
			}
		});
	}
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Shows all of the found elements
 * 
 * For example, to show all p tags on the page, you would use the following line
 * 
 *     $('p').show();
 * 
 * To fade the elements in, you would specify the fade transition as the optional argument
 * 
 *     $('p').show('fade');
 * 
 * You can also pass a function as the second argument to be run when the transition completes, like so
 * 
 *     $('p').show('fade', function() {
 *         alert('done');
 *     });
 * 
 * This function takes the originial display type into account.
 * 
 * @param {String} transition Optional name of the transition to use to show. Default transitions are: fade, slide and smooth
 * @param {Function} callback Optional function to be run after the transition completes
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('show', function(transition, callback) {
	// Initialise any required variables
	var that = this;
	
	// Check for a transition
	if(typeof transition === 'string') {
		// Show it with the specified transition
		// Check for the transition
		if(typeof this.transitions.show[transition] === 'function') {
			// Loop through all of the elements
			this.each(function(e) {
				// Run the transition
				that.transitions.show[transition](that.find(e), callback);
			});
		}
		else {
			// If it does not exist, default to just showing it
			this.show();
		}
	}
	else {
		// Just show it
		// Loop through all the elements
		this.each(function(e) {
			// Show the element with the correct display type
			that.find(e).style('display', that.find(e).data('SparkDisplayType'));
		});
	}
	
	// Return the Spark object for chaining
	return this;
});
/**
 * Converts colors to RGB or hex from RGB, hex or the color name
 * 
 * Simply run any of the functions (`toArray`, `toRgb`, `toHex` or `toName`) and pass it your color in any of the following formats.
 * 
 *  * Array - `[25, 10, 255]`
 *  * RGB - `rgb(25, 10, 255)`
 *  * Hex - `#FFC609`
 *  * Name - `red`
 * 
 * The method will then return the color converted to either an array, rgb, hex or its name equivilent depending on what method you ran.
 * 
 * You also have access to all of the colors and their values by name. For instance, the following code will return `[255, 0, 0]`
 * 
 *     Spark.color.names.red;
 * 
 * To then convert that into hex you would use the following line.
 * 
 *     Spark.color.toHex(Spark.color.names.red);
 */

/** @private */
Spark.extend('color', {
    /**
     * Converts any color to an array containing its rgb values
     * 
     * @param {String|Array} color The color string to convert (RGB, hex or a color name such as 'red') or the RGB array
     * @returns {Array} The array containing the rgb values
     */
	toArray: function(color) {
		// Initialise any required variables
		var i = null,
			split = [],
			colors = this.names;
		
		if(color instanceof Array) {
			// It is already an array, return it
			return color;
		}
		else if(color.indexOf('rgb') === 0) {
			// It is RGB, take out the 'rgb(', ')' and spaces, split it by commas and assign it to split
			split = color.replace(/rgb\(|\)|\s/gi, '').split(',');
		}
		else if(color.indexOf('#') === 0) {
			// It is hex, take off the hash
			color = color.slice(1);
			
			// Convert it to the right length if it is the shorthand
			if(color.length === 3) {
				color = color.replace(/([0-9a-f])/ig, '$1$1');
			}
			
			// Split the string into its main components and convert them to RGB
			for(i = 0; i < 3; i++) {
				split.push(parseInt(color.slice(i * 2, (i + 1) * 2), 16));
			}
		}
		else {
			// It is a name, loop through until we find it
			for(i in colors) {
				if(colors.hasOwnProperty(i) && i === color.toLowerCase()) {
					// Found it, assign the value to split. This has to be done like this so it returns a new array, not a reference
					split = [colors[i][0], colors[i][1], colors[i][2]];
				}
			}
		}
		
		// Convert all colors to numbers
		for(i = 0; i < 3; i++) {
			split[i] = parseInt(split[i], 10);
		}
		
		// Return the color as an object
		return split;
	},
	
    /**
     * Converts any color to a RGB string
     * 
     * @param {String|Array} color The color string to convert (RGB, hex or a color name such as 'red') or the RGB array
     * @returns {String} The RGB string
     */
	toRgb: function(color) {
		// Convert the color to an array and return the rgb version
		return 'rgb(' + this.toArray(color).join(', ') + ')';
	},
	
    /**
     * Converts any color to a hex string
     * 
     * @param {String|Array} color The color string to convert (RGB, hex or a color name such as 'red') or the RGB array
     * @returns {String} The hex string
     */
	toHex: function(color) {
		// Initialise any required variables
		var i = null;
		
		// Convert the color to an array
		color = this.toArray(color);
		
		// Loop over the array
		for(i = 0; i < 3; i++) {
			// Convert it to hex
			color[i] = color[i].toString(16).toUpperCase();
			
			// Make sure it is always the right length
			if(color[i].length === 1) {
				color[i] = color[i] + color[i];
			}
		}
		
		// Return the joined version
		return '#' + color.join('');
	},
	
    /**
     * Converts any color to its name equivilant, if there is not a name for it then it will return false
     * 
     * @param {String|Array} color The color string to convert (RGB, hex or a color name such as 'red') or the RGB array
     * @returns {String|Boolean} The name of the color or false if there is not a name for it
     */
	toName: function(color) {
		// Initialise any required variables
		var i = null,
			colors = this.names;
		
		// Convert it to an array
		color = this.toArray(color);
		
		// Loop through all of the names
		for(i in colors) {
			if(colors.hasOwnProperty(i)) {
				// Compare
				if(color[0] === colors[i][0] && color[1] === colors[i][1] && color[2] === colors[i][2]) {
					// Found it, return the name
					return i;
				}
			}
		}
		
		// Did not find a name, return false
		return false;
	},
	
	names: {
		aliceblue: [240, 248, 255],
		antiquewhite: [250, 235, 215],
		aqua: [0, 255, 255],
		aquamarine: [127, 255, 212],
		azure: [240, 255, 255],
		beige: [245, 245, 220],
		bisque: [255, 228, 196],
		black: [0, 0, 0],
		blanchedalmond: [255, 235, 205],
		blue: [0, 0, 255],
		blueviolet: [138, 43, 226],
		brown: [165, 42, 42],
		burlywood: [222, 184, 135],
		cadetblue: [95, 158, 160],
		chartreuse: [127, 255, 0],
		chocolate: [210, 105, 30],
		coral: [255, 127, 80],
		cornflowerblue: [100, 149, 237],
		cornsilk: [255, 248, 220],
		crimson: [220, 20, 60],
		cyan: [0, 255, 255],
		darkblue: [0, 0, 139],
		darkcyan: [0, 139, 139],
		darkgoldenrod: [184, 134, 11],
		darkgray: [169, 169, 169],
		darkgreen: [0, 100, 0],
		darkgrey: [169, 169, 169],
		darkkhaki: [189, 183, 107],
		darkmagenta: [139, 0, 139],
		darkolivegreen: [85, 107, 47],
		darkorange: [255, 140, 0],
		darkorchid: [153, 50, 204],
		darkred: [139, 0, 0],
		darksalmon: [233, 150, 122],
		darkseagreen: [143, 188, 143],
		darkslateblue: [72, 61, 139],
		darkslategray: [47, 79, 79],
		darkslategrey: [47, 79, 79],
		darkturquoise: [0, 206, 209],
		darkviolet: [148, 0, 211],
		deeppink: [255, 20, 147],
		deepskyblue: [0, 191, 255],
		dimgray: [105, 105, 105],
		dimgrey: [105, 105, 105],
		dodgerblue: [30, 144, 255],
		firebrick: [178, 34, 34],
		floralwhite: [255, 250, 240],
		forestgreen: [34, 139, 34],
		fuchsia: [255, 0, 255],
		gainsboro: [220, 220, 220],
		ghostwhite: [248, 248, 255],
		gold: [255, 215, 0],
		goldenrod: [218, 165, 32],
		gray: [128, 128, 128],
		green: [0, 128, 0],
		greenyellow: [173, 255, 47],
		grey: [128, 128, 128],
		honeydew: [240, 255, 240],
		hotpink: [255, 105, 180],
		indianred: [205, 92, 92],
		indigo: [75, 0, 130],
		ivory: [255, 255, 240],
		khaki: [240, 230, 140],
		lavender: [230, 230, 250],
		lavenderblush: [255, 240, 245],
		lawngreen: [124, 252, 0],
		lemonchiffon: [255, 250, 205],
		lightblue: [173, 216, 230],
		lightcoral: [240, 128, 128],
		lightcyan: [224, 255, 255],
		lightgoldenrodyellow: [250, 250, 210],
		lightgray: [211, 211, 211],
		lightgreen: [144, 238, 144],
		lightgrey: [211, 211, 211],
		lightpink: [255, 182, 193],
		lightsalmon: [255, 160, 122],
		lightseagreen: [32, 178, 170],
		lightskyblue: [135, 206, 250],
		lightslategray: [119, 136, 153],
		lightslategrey: [119, 136, 153],
		lightsteelblue: [176, 196, 222],
		lightyellow: [255, 255, 224],
		lime: [0, 255, 0],
		limegreen: [50, 205, 50],
		linen: [250, 240, 230],
		magenta: [255, 0, 255],
		maroon: [128, 0, 0],
		mediumaquamarine: [102, 205, 170],
		mediumblue: [0, 0, 205],
		mediumorchid: [186, 85, 211],
		mediumpurple: [147, 112, 216],
		mediumseagreen: [60, 179, 113],
		mediumslateblue: [123, 104, 238],
		mediumspringgreen: [0, 250, 154],
		mediumturquoise: [72, 209, 204],
		mediumvioletred: [199, 21, 133],
		midnightblue: [25, 25, 112],
		mintcream: [245, 255, 250],
		mistyrose: [255, 228, 225],
		moccasin: [255, 228, 181],
		navajowhite: [255, 222, 173],
		navy: [0, 0, 128],
		oldlace: [253, 245, 230],
		olive: [128, 128, 0],
		olivedrab: [107, 142, 35],
		orange: [255, 165, 0],
		orangered: [255, 69, 0],
		orchid: [218, 112, 214],
		palegoldenrod: [238, 232, 170],
		palegreen: [152, 251, 152],
		paleturquoise: [175, 238, 238],
		palevioletred: [216, 112, 147],
		papayawhip: [255, 239, 213],
		peachpuff: [255, 218, 185],
		peru: [205, 133, 63],
		pink: [255, 192, 203],
		plum: [221, 160, 221],
		powderblue: [176, 224, 230],
		purple: [128, 0, 128],
		red: [255, 0, 0],
		rosybrown: [188, 143, 143],
		royalblue: [65, 105, 225],
		saddlebrown: [139, 69, 19],
		salmon: [250, 128, 114],
		sandybrown: [244, 164, 96],
		seagreen: [46, 139, 87],
		seashell: [255, 245, 238],
		sienna: [160, 82, 45],
		silver: [192, 192, 192],
		skyblue: [135, 206, 235],
		slateblue: [106, 90, 205],
		slategray: [112, 128, 144],
		slategrey: [112, 128, 144],
		snow: [255, 250, 250],
		springgreen: [0, 255, 127],
		steelblue: [70, 130, 180],
		tan: [210, 180, 140],
		teal: [0, 128, 128],
		thistle: [216, 191, 216],
		tomato: [255, 99, 71],
		turquoise: [64, 224, 208],
		violet: [238, 130, 238],
		wheat: [245, 222, 179],
		white: [255, 255, 255],
		whitesmoke: [245, 245, 245],
		yellow: [255, 255, 0],
		yellowgreen: [154, 205, 50]
	}
});
/**
 * Stops all animations for the specified elements
 * 
 * For example, to stop the animation of all div's on the page, you would use the following line
 * 
 *     $('div').stop();
 * 
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('stop', function() {
	// Initialise any required variables
	var that = this,
		element = null;
	
	// Loop through all of the elements
	this.each(function(e) {
		// Grab the element
		element = that.find(e);
		
		// Make sure the element has a timeout and animation array
		if(element.data('SparkTimeouts') && element.data('SparkAnimations')) {
			 // Loop through all of the timeouts
			that.each(function(t) {
				clearTimeout(t);
			}, element.data('SparkTimeouts'));
			
			// Reset the array
			element.data('SparkTimeouts', []);
			
			// Reset the animations array
			element.data('SparkAnimations', []);
		}
	});
	
	// Return the Spark object
	return this;
});
/** 
 * Toggle the visibility of the specified elements
 * 
 * For example, to toggle the visibility of all p tags on the page, you would use the following line
 * 
 *     $('p').toggle();
 * 
 * @returns {Object} Returns the Spark object for chaining
 */
Spark.extend('toggle', function() {
	// Initialise any required variables
	var that = this,
		element = null;
	
	// Loop through the elements
	this.each(function(e) {
		// Grab the element
		element = that.find(e);
		
		// Check wether it is display none or not
		if(element.style('display') === 'none') {
			// It is, show it
			element.show();
		}
		else {
			// It is not, hide it
			element.hide();
		}
	});
	
	// Return the Spark object
	return this;
});
/**
 * Extendible object of transitions for use with the show and hide functions
 * 
 * To add a transition you can use the following template
 * 
 *     Spark.transitions.show.transitionName(function(element, callback) {
 *         // Do your stuff for showing and call the callback if one was passed
 *     });
 * 
 *     Spark.transitions.hide.transitionName(function(element, callback) {
 *         // Do your stuff for hiding and call the callback if one was passed
 *     });
 * 
 * Remember to check for the callback first before calling it and try to put things back how they where
 */
Spark.extend('transitions', {
	show: {
		fade: function(element, callback) {
			// Show the element and grab its opacity
			var original = element.show().style('opacity');
			
			// Set the opacity to 0 and fade its opacity to its original
			element.style('opacity', 0).animate({
				opacity: original
			}, false, false, function() {
				// Run the callback if there is one
				if(callback) {
					callback();
				}
			});
		},
		slide: function(element, callback) {
			// Show the element and grab its height
			var originalHeight = element.show().style('height'),
				// Grab its overflow and default to visible
				originalOverflow = element.style('overflow') || 'visible';
			
			// Set the height to 0 and the overflow to hidden and then slide it to its original
			element.style({
				height: 0,
				overflow: 'hidden'
			}).animate({
				height: originalHeight
			}, false, false, function() {
				// Set the overflow to its original
				element.style('overflow', originalOverflow);
				
				// Run the callback if there is one
				if(callback) {
					callback();
				}
			});
		},
		smooth: function(element, callback) {
			// Show the element and grab its height
			var originalHeight = element.show().style('height'),
				// Grab its width
				originalWidth = element.style('width'),
				// Grab its opacity
				originalOpacity = element.style('opacity'),
				// Grab its overflow and default to visible
				originalOverflow = element.style('overflow') || 'visible';
			
			// Set the height, width and opacity to 0. Set the overflow to hidden and then animate everything to its original values
			element.style({
				height: 0,
				width: 0,
				opacity: 0,
				overflow: 'hidden'
			}).animate({
				height: originalHeight,
				width: originalWidth,
				opacity: originalOpacity
			}, false, false, function() {
				// Set the overflow to its original value
				element.style('overflow', originalOverflow);
				
				// Run the callback if there is one
				if(callback) {
					callback();
				}
			});
		}
	},
	hide: {
		fade: function(element, callback) {
			// Grab its opacity
			var original = element.style('opacity');
			
			// Fade the opacity to 0, set it back to its original
			element.animate({
				opacity: 0
			}, false, false, function() {
				// Hide it
				element.style('opacity', original).hide();
				
				// Run the callback if there is one
				if(callback) {
					callback();
				}
			});
		},
		slide: function(element, callback) {
			// Grab its height
			var originalHeight = element.style('height'),
				// Grab its overflow and default to visible
				originalOverflow = element.style('overflow') || 'visible';
			
			// Set its overflow to hidden and slide its height to 0
			element.style('overflow', 'hidden').animate({
				height: 0
			}, false, false, function() {
				element.style({
					// Set everything back to their defaults and hide it
					height: originalHeight,
					overflow: originalOverflow
				}).hide();
				
				// Run the callback if there is one
				if(callback) {
					callback();
				}
			});
		},
		smooth: function(element, callback) {
			// Grab its height
			var originalHeight = element.style('height'),
				// Grab its width
				originalWidth = element.style('width'),
				// Grab its opacity
				originalOpacity = element.style('opacity'),
				// Grab its overflow and default to visible
				originalOverflow = element.style('overflow') || 'visible';
			
			// Set its overflow to hidden and animate everything to 0
			element.style('overflow', 'hidden').animate({
				height: 0,
				width: 0,
				opacity: 0
			}, false, false, function() {
				// Set everything back to their defaults and hide it
				element.style({
					height: originalHeight,
					width: originalWidth,
					opacity: originalOpacity,
					overflow: originalOverflow
				}).hide();
				
				// Run the callback if there is one
				if(callback) {
					callback();
				}
			});
		}
	}
});
