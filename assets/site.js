// Reads pieces.json, then draws every piece inside its own shadow root,
// so each piece's `.single-div` rule can't leak into another.

const grid = document.querySelector( '[data-grid]' );
const empty = document.querySelector( '[data-empty]' );
const viewer = document.querySelector( '[data-viewer]' );

// Frames the drawing inside each shadow root. The piece's own CSS comes after it.
const STAGE_CSS = ':host { display: block; } .single-div-stage { display: grid; place-items: center; width: 200px; height: 200px; }';

const REPO = 'https://github.com/00kaku/one-div/blob/production/';

const pad = ( n ) => String( n ).padStart( 2, '0' );

// Dark or light text, whichever reads better on a tile's colour.
function inkFor( hex ) {
	const h = hex.replace( '#', '' );
	const full = h.length === 3 ? [ ...h ].map( ( c ) => c + c ).join( '' ) : h;
	const [ r, g, b ] = [ 0, 2, 4 ].map( ( i ) => parseInt( full.slice( i, i + 2 ), 16 ) / 255 );
	const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return lum > 0.55 ? '#1d1b16' : '#fffdf8';
}

// 2026-10-21 → 21 Oct 2026
function formatDate( iso ) {
	const [ y, m, d ] = iso.split( '-' ).map( Number );
	return new Date( y, m - 1, d ).toLocaleDateString( 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' } );
}

// A piece file is a header comment, the stage markup, then one <style>.
function parsePiece( html ) {
	const markup = html.replace( /<!--[\s\S]*?-->/, '' ).trim();
	const css = ( html.match( /<style>([\s\S]*?)<\/style>/ ) || [ '', '' ] )[ 1 ].trim();
	return { markup, css };
}

function draw( host, piece ) {
	const root = host.shadowRoot || host.attachShadow( { mode: 'open' } );
	root.innerHTML = `<style>${ STAGE_CSS }</style>${ piece.markup }`;
}

function escapeHtml( s ) {
	return s.replace( /[&<>"]/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } )[ c ] );
}

// Just enough highlighting to read the CSS: comments, colours (with a swatch), functions, numbers.
function highlight( css ) {
	const token = /(\/\*[\s\S]*?\*\/)|(#[0-9a-fA-F]{3,8}\b)|([a-z-]+)(?=\()|(-?\d*\.?\d+(?:px|%|deg|em|rem|s|ms|vw|vh)?)\b/g;
	let out = '';
	let last = 0;
	for ( const m of css.matchAll( token ) ) {
		out += escapeHtml( css.slice( last, m.index ) );
		const [ text, comment, colour, fn, num ] = m;
		if ( comment ) {
			out += `<span class="tok-com">${ escapeHtml( text ) }</span>`;
		} else if ( colour ) {
			out += `<span class="swatch" style="background:${ colour }"></span>${ text }`;
		} else if ( fn ) {
			out += `<span class="tok-fn">${ text }</span>`;
		} else if ( num ) {
			out += `<span class="tok-num">${ text }</span>`;
		}
		last = m.index + text.length;
	}
	return out + escapeHtml( css.slice( last ) );
}

async function load() {
	const list = await ( await fetch( 'pieces.json' ) ).json();
	list.sort( ( a, b ) => a.n - b.n );

	const pieces = await Promise.all( list.map( async ( meta ) => {
		const html = await ( await fetch( meta.file ) ).text();
		return { ...meta, ...parsePiece( html ) };
	} ) );

	return pieces;
}

function renderGrid( pieces ) {
	grid.innerHTML = '';
	pieces.forEach( ( piece, i ) => {
		const li = document.createElement( 'li' );
		li.dataset.level = piece.level;
		li.classList.toggle( 'wide', !! piece.wide );
		const bg = piece.bg || '#f4efe4';
		li.innerHTML = `
			<button type="button" class="tile" style="--tile-bg:${ bg };--tile-ink:${ inkFor( bg ) }" aria-label="${ pad( piece.n ) } ${ escapeHtml( piece.title ) }, open">
				<span class="tile__art"></span>
				<span class="tile__label"><b>${ pad( piece.n ) }</b>${ escapeHtml( piece.title ) }</span>
			</button>`;
		draw( li.querySelector( '.tile__art' ), piece );
		li.querySelector( 'button' ).addEventListener( 'click', () => open( i ) );
		grid.append( li );
	} );
	layout();
}

// Wide tiles take a full row. A half tile left alone on its row (before a
// wide one, or at the end) stretches too, so the wall never has a hole.
function layout() {
	let halves = [];
	const flush = () => {
		if ( halves.length % 2 ) {
			halves[ halves.length - 1 ].classList.add( 'is-wide' );
		}
		halves = [];
	};
	grid.querySelectorAll( 'li' ).forEach( ( li ) => {
		li.classList.toggle( 'is-wide', li.classList.contains( 'wide' ) );
		if ( li.classList.contains( 'wide' ) ) {
			flush();
		} else {
			halves.push( li );
		}
	} );
	flush();
}

/* Viewer */

let pieces = [];
let current = 0;

const art = viewer.querySelector( '[data-viewer-art]' );
const cssOut = viewer.querySelector( '[data-viewer-css]' );

function show( i ) {
	current = ( i + pieces.length ) % pieces.length;
	const piece = pieces[ current ];
	draw( art, piece );
	viewer.querySelector( '[data-viewer-eyebrow]' ).textContent = `${ pad( piece.n ) } · Level ${ piece.level }`;
	viewer.querySelector( '[data-viewer-title]' ).textContent = piece.title;
	viewer.querySelector( '[data-viewer-dates]' ).textContent =
		`Drawn ${ formatDate( piece.submitted ) }` +
		( piece.revised && piece.revised !== piece.submitted ? ` · revised ${ formatDate( piece.revised ) }` : '' );
	viewer.querySelector( '[data-viewer-stage]' ).style.setProperty( '--stage-bg', piece.bg || '' );
	viewer.querySelector( '[data-source]' ).href = REPO + piece.file;
	cssOut.innerHTML = highlight( piece.css );
	history.replaceState( null, '', `#${ pad( piece.n ) }-${ piece.slug }` );
}

function open( i ) {
	show( i );
	if ( ! viewer.open ) {
		viewer.showModal();
		// Focus the dialog itself, not its first button, so no ring shows on open.
		viewer.focus();
	}
}

function setZoom( z ) {
	art.style.zoom = z;
	viewer.querySelectorAll( '[data-zoom]' ).forEach( ( b ) => b.setAttribute( 'aria-pressed', b.dataset.zoom === z ) );
}

viewer.querySelector( '[data-prev]' ).addEventListener( 'click', () => show( current - 1 ) );
viewer.querySelector( '[data-next]' ).addEventListener( 'click', () => show( current + 1 ) );
viewer.querySelector( '[data-close]' ).addEventListener( 'click', () => viewer.close() );
viewer.querySelectorAll( '[data-zoom]' ).forEach( ( b ) => b.addEventListener( 'click', () => setZoom( b.dataset.zoom ) ) );

viewer.addEventListener( 'keydown', ( e ) => {
	if ( e.key === 'ArrowLeft' ) {
		show( current - 1 );
	} else if ( e.key === 'ArrowRight' ) {
		show( current + 1 );
	}
} );

// Clicking the backdrop (the dialog itself, outside its content) closes it.
viewer.addEventListener( 'click', ( e ) => {
	if ( e.target === viewer ) {
		viewer.close();
	}
} );

viewer.addEventListener( 'close', () => history.replaceState( null, '', location.pathname ) );

viewer.querySelector( '[data-copy]' ).addEventListener( 'click', async ( e ) => {
	try {
		await navigator.clipboard.writeText( pieces[ current ].css );
		e.target.textContent = 'Copied';
	} catch {
		e.target.textContent = 'Copy failed';
	}
	setTimeout( () => ( e.target.textContent = 'Copy' ), 1500 );
} );

load().then( ( loaded ) => {
	pieces = loaded;
	empty.hidden = pieces.length > 0;
	renderGrid( pieces );

	// A link like #06-mountain opens that drawing.
	const fromHash = pieces.findIndex( ( p ) => location.hash === `#${ pad( p.n ) }-${ p.slug }` );
	if ( fromHash > -1 ) {
		open( fromHash );
	}
} ).catch( () => {
	empty.hidden = false;
	empty.textContent = 'Couldn’t load the drawings. Serve this folder over HTTP (see README).';
} );
