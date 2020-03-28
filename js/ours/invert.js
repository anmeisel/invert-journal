// header minimise on scroll down

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

// themes toggle

const toggler2 = document.getElementById('dropdown-toggle-2')
const state2 = document.getElementById('dropdown-state-2')

toggler2.addEventListener('click', e => {
	e.stopPropagation()
	if (state2.checked) {
		state2.checked = false
	} else {
		state2.checked = true
	}
})

document.getElementsByTagName('body')[0].addEventListener('click', () => {
	if (state1.checked) {
		state1.checked = false
	}
	if (state2.checked) {
		state2.checked = false
	}
})
