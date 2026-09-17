'use strict';

document.addEventListener('DOMContentLoaded', function ()
{
	const email = document.getElementById('text-obfu').firstChild;

	email.nodeValue = email.nodeValue
		.replace(' ', '@')
		.replaceAll(' ', '.')
		.replaceAll(new RegExp('[zuy]', 'g'), '')
		.replace('example', 'thundermail');
});

document.addEventListener('DOMContentLoaded', function ()
{
	const a = document.getElementsByClassName('href-obfu');
    
    for (var i = 0; i < a.length; i++) {
	    a[i].setAttribute('href', a[i].getAttribute('href')
		    .replace('-', 'vs@')
		    .replace('/', '.com')
		    .replace('to', 'mailto:a')
	    );
    }
});

document.addEventListener('DOMContentLoaded', function () {
	const email = document.getElementById('itext-obfu').firstChild;

	email.nodeValue = email.nodeValue
		.replace(' ', '@')
		.replaceAll(' ', '.')
		.replaceAll(new RegExp('[zoy]', 'g'), '')
		.replace('example', 'duke');
});

document.addEventListener('DOMContentLoaded', function () {
	const a = document.getElementsByClassName('ihref-obfu');

	for (var i = 0; i < a.length; i++) {
		a[i].setAttribute('href', a[i].getAttribute('href')
			.replace('-', 'di.vs@')
			.replace('/', '.edu')
			.replace('to', 'mailto:a')
		);
	}
});