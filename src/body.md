# Spark documentation (v3.0.0)

## Table of contents

 * [Introduction](#introduction)
 * [Getting the source](#getting-the-source)
 * [Compatibility](#compatibility)
 * [Hello, World!](#hello-world)
 * [Elements](#elements)
  * [createElement](#createelement)
  * [insertElement](#insertelement)
  * [prependElement](#prependelement)
  * [appendElement](#appendelement)
  * [removeElement](#removeelement)
 * [Visibility](#visibility)
  * [show](#show)
  * [hide](#hide)

<h2 id='introduction'>Introduction</h2>

Because you have downloaded this then I am assuming you know what Spark is, if not here is a quick overview.

    Spark is a great JavaScript library which can animate, perform AJAX calls, parse / stringify JSON and convert colors plus a whole lot more which I simply do not have enough time to go into.

Got it? Good. So in this document, which was lovingly coded by the developer of Spark ([Oliver Caldwell](http://flowdev.co.uk/)), you will find a step by step guide of how to use the library.

In the next section you will also find links to the source files although you probably saw them on your way in. The source files are `spark.js` and `spark.min.js` from this folder.

You can find generated documentation online, [here](http://sparkjs.github.com/Spark/), which is generated straight from the repository so it might include things that have not been released yet.

<h2 id='getting-the-source'>Getting the source</h2>

So to grab the source files you are going to want to navigate to the folder this file is located in and copy either `spark.js` or `spark.min.js`.

The only difference between them is that one has been minified with the [Google closure compiler](http://code.google.com/closure/compiler/).

Or alternatively you can follow these links to either the [development](spark.js) or [minified](spark.min.js) versions of Spark.

<h2 id='compatibility'>Compatibility</h2>

Spark works perfectly in the following browsers. I am sure it works perfectly in many more, I just can't test them all.

 * Chrome
 * Firefox
 * Safari
 * Opera
 * IE6 to IE9

It almost works perfectly in IE5. That's right, **IE5**. The only thing that does not work are asynchronous AJAX calls.

<h2 id='hello-world'>Hello, World!</h2>

You guessed it, we are kicking off with a hello world just to get you used to the syntax of the API.

I have added a file called `template.html` into this folder which you can insert your JavaScript right into.

So first off we are going to need to wait until the DOM is ready before we go messing with it. So we always start off *every* script with the following code.

    Spark.ready(function() {
        // Your code will go here
    });

Go ahead and add that into the script tag in the template that says `Your code goes here`.

Now we are going to create and insert a paragraph tag into the DOM with this line.

    $('body').insertElement('p', 'Hello, World!');

Now when you refresh your page **boom!**, the world gets greeted by your page. How sweet.

The selection of elements is a little different to Spark v2.X.X. Now it uses my own selector engine with fully compliant [CSS2 syntax](http://www.w3.org/TR/CSS2/selector.html#pattern-matching) rather than bulky Sizzle which made up half of the file size.

I have also made it so the selection of elements is done via `Spark.find` and `$()` is just a alias for it. Let me show you what I mean.

    $('body'); // Works
    Spark.find('body'); // Works
    Spark('body') // Does not work

Although I may add it in the future I think it is good like this. It helps separate logic such as color conversion.

    Spark.color(...);

And DOM manipulation such as animation.

    $('...').animate(...);

Obviously if you have jQuery etc on your page already then it will not overwrite the $ variable, it will just not use it.

<h2 id='elements'>Elements</h2>

In the previous section I created an element. Now I will explain the five element functions.

<h3 id='createelement'>createElement(name, contents, attributes, styles)</h3>

This function takes four arguments, the name of the tag, the innerHTML or *contents* of the tag, the attributes to be assigned to it (or false if you want to skip it) and the styles to be assigned to it.

It will return the finished element.

The following script will create a paragraph tag with `Hello, World!` as its contents.

    var myElement = Spark.createElement('p', 'Hello, World!');

Now if we want to make it red, we pass false for the attributes because we are not setting any, and an object with `color: '#FF0000'` inside it.

    var myElement = Spark.createElement('p', 'Hello, World!', false, {
        color: '#FF0000'
    });

If we wanted to create it with its title set to `Greeting` we would use the following.

    var myElement = Spark.createElement('p', 'Hello, World!', {
        title: 'Greeting'
    }, {
        color: '#FF0000'
    });

<h3 id='insertelement'>insertElement(name, contents, attributes, styles)</h3>

This takes the same arguments as the previous function but immediately inserts the element into the found elements.

This is what we used for the `Hello, World!` example.

    $('body').insertElement('p', 'Hello, World!');

You can also pass a pre created element like so.

    // Create the element
    var myElement = Spark.createElement('p', 'Hello, World!');
    
    // Insert the element
    $('body').insertElement(myElement);

<h3 id='prependelement'>prependElement(name, contents, attributes, styles)</h3>

This works exactly the same as the `insertElement` function. The only difference is that it inserts the element before the found elements.

<h3 id='appendelement'>appendElement(name, contents, attributes, styles)</h3>

This works exactly the same as the `insertElement` function. The only difference is that it inserts the element after the found elements.

<h3 id='removeelement'>removeElement()</h3>

This removes all found elements. So to remove all paragraph tags with a class of `warning` from the page you would use the following line.

    $('p.warning').removeElement();

<h2 id='visibility'>Visibility</h2>

Using the `show` and `hide` functions you can...show and hide elements. You can also specify transitions to use.

The default transition names are as follows.

 * fade
 * slide
 * smooth

You can add more by adding a transition function to `Spark.transitions.show` and `Spark.transitions.hide`.

You must add one for showing the element and one for hiding it. If not, then users can only go one way with your transition and will have to use another for the reverse.

Here is the source for the fade transitions as an example.

    Spark.transitions.show.fade = function(element, callback) {
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
    };
    
    Spark.transitions.hide.fade = function(element, callback) {
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
    };

<h3 id='show'>show(transition, callback)</h3>

Shows all found elements, if a transition is specified then it will be shown with that transition. If a callback has been passed then it will be run at the end of the transition.

<h3 id='hide'>hide(transition, callback)</h3>

Hides all found elements, if a transition is specified then it will be hidden with that transition. If a callback has been passed then it will be run at the end of the transition.