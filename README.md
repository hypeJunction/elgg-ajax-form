Elgg Ajax Form
==============
![Elgg 2.3](https://img.shields.io/badge/Elgg-2.3.x-orange.svg?style=flat-square)

Dealing with form submission using jQuery is hell, especially when you have to bind multiple handlers that depend on each other.
This plugin provides a module that can be used to queue promise-based handlers.

```js
var Form = require('ajax/Form');
var form = new Form('.my-form');
var Ajax = require('elgg/Ajax');

form.onSubmit(function(resolve, reject) {
	// execute a long running script, e.g. validate fields via ajax
	var ajax = new Ajax();
	ajax.post('somewhere').done(resolve).fail(reject);
})

form.onSubmit(function(resolve, reject) {
	console.log('hello');
	resolve();
});


// By default, once all promises are resolved, the form will be submitted via ajax,
// and the user will be forwarded to the URL specified by the response
// You can however register custom success callbacks to prevent redirection

form.onSuccess(function(data) {
	console.log(data);
	
	require('elgg/lightbox', function(lightbox) {
		lightbox.close();
	});
	
	$('.my-list').refresh();
});

// You can also add your own error handler

form.onError(function(error) {
	console.log(error);
});
```