// Hide header and minimise site name on scroll down

window.onscroll = function() {
	scrollFunction()
}

function scrollFunction() {
	if (document.body.scrollTop > 30 || document.documentElement.scrollTop > 30) {
		document.getElementById('site-name').style.cssText += 'font-size: 1.1875rem; bottom: 0px;'
		$('header')
			.removeClass('nav-down')
			.addClass('nav-up')
	} else {
		document.getElementById('site-name').style.cssText += 'font-size: 2.2875rem; bottom: 55px;'
		$('header')
			.removeClass('nav-up')
			.addClass('nav-down')
	}
}


