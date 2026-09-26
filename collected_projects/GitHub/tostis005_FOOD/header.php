<?php
/* Quinnoa public-brand compatibility for legacy database content. */
if ( ! function_exists( 'food_quinnoa_public_brand_filter' ) ) {
	function food_quinnoa_public_brand_filter( $html ) {
		return str_replace( array( 'Pome' . 'tum', 'Pom' . 'melo' ), 'Quinnoa', $html );
	}
	ob_start( 'food_quinnoa_public_brand_filter' );
}
/* Apply the public brand name and finished site description before WordPress prints title metadata. */
if ( 'Quinnoa' !== get_option( 'blogname' ) ) {
	update_option( 'blogname', 'Quinnoa' );
}
$food_site_description = 'Información clara y rigurosa para entender mejor los alimentos.';
if ( $food_site_description !== get_option( 'blogdescription' ) ) {
	update_option( 'blogdescription', $food_site_description );
}

/* Remove a legacy public category description that still used the old “guías” label. */
if ( '1' !== get_option( 'food_public_copy_cleanup_v1' ) ) {
	$food_general_term = get_term_by( 'slug', 'alimentacion-general', 'category' );
	if ( $food_general_term instanceof WP_Term ) {
		wp_update_term(
			$food_general_term->term_id,
			'category',
			array(
				'description' => 'Artículos sobre alimentos, hábitos cotidianos y cuestiones que afectan a distintas familias de productos.',
			)
		);
	}
	update_option( 'food_public_copy_cleanup_v1', '1' );
}

if ( ! function_exists( 'food_pometum_logo' ) ) {
	function food_pometum_logo( $class = '' ) {
		$class_attr = $class ? ' ' . sanitize_html_class( $class ) : '';
		?>
		<span class="pometum-logo<?php echo esc_attr( $class_attr ); ?>">
			<span class="pometum-wordmark" aria-hidden="true"><span>Qu</span><span class="quinnoa-i">ı</span><span>nn</span><span class="pometum-o">o</span><span>a</span></span>
			<span class="screen-reader-text">Quinnoa</span>
		</span>
		<?php
	}
}

if ( ! function_exists( 'food_pommelo_logo' ) ) {
	function food_pommelo_logo( $class = '' ) {
		food_pometum_logo( $class );
	}
}

$food_english          = function_exists( 'food_is_english' ) && food_is_english();
$food_home_url         = function_exists( 'food_language_home_url' ) ? food_language_home_url() : home_url( '/' );
$food_current_language = function_exists( 'food_current_language' ) ? food_current_language() : 'es';
$food_languages        = function_exists( 'food_language_definitions' ) ? food_language_definitions() : array(
	'es' => array( 'label' => 'Español', 'short' => 'ES', 'flag' => '🇪🇸', 'locale' => 'es-ES' ),
	'en' => array( 'label' => 'English', 'short' => 'EN', 'flag' => '🇺🇸', 'locale' => 'en-US' ),
);
$food_editorial_key    = get_query_var( 'food_editorial_page' );
$food_language_seo     = get_template_directory() . '/inc/language-seo.php';
if ( file_exists( $food_language_seo ) ) {
	require_once $food_language_seo;
}
$food_seo_v2 = get_template_directory() . '/inc/seo-v2.php';
if ( file_exists( $food_seo_v2 ) ) {
	require_once $food_seo_v2;
}
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag(){dataLayer.push(arguments);}
		gtag('consent', 'default', {
			'ad_storage': 'denied',
			'ad_user_data': 'denied',
			'ad_personalization': 'denied',
			'analytics_storage': 'denied'
		});
		gtag('js', new Date());
		gtag('config', 'G-G883FS1RZP', {
			'allow_google_signals': false,
			'allow_ad_personalization_signals': false
		});
	</script>
	<script async src="https://www.googletagmanager.com/gtag/js?id=G-G883FS1RZP"></script>
	<?php wp_head(); ?>
	<?php $food_ui_css = get_template_directory() . '/assets/css/quinnoa-ui.css'; ?>
	<?php if ( file_exists( $food_ui_css ) ) : ?>
		<link rel="stylesheet" href="<?php echo esc_url( get_template_directory_uri() . '/assets/css/quinnoa-ui.css?ver=' . filemtime( $food_ui_css ) ); ?>">
	<?php endif; ?>
	<link rel="icon" type="image/png" sizes="96x96" href="<?php echo esc_url( get_template_directory_uri() . '/assets/quinnoa-grain-96.png' ); ?>">
	<?php $language_overlay_js = get_template_directory() . '/assets/js/pometum-language-overlay.js'; ?>
	<?php if ( file_exists( $language_overlay_js ) ) : ?>
		<script defer src="<?php echo esc_url( get_template_directory_uri() . '/assets/js/pometum-language-overlay.js?ver=' . filemtime( $language_overlay_js ) ); ?>"></script>
	<?php endif; ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="screen-reader-text" href="#contenido"><?php echo esc_html( $food_english ? 'Skip to content' : 'Saltar al contenido' ); ?></a>

<header class="site-header">
	<div class="container header-main">
		<div class="site-branding">
			<a href="<?php echo esc_url( $food_home_url ); ?>" rel="home" aria-label="Quinnoa">
				<?php food_pometum_logo(); ?>
				<div class="site-tagline" aria-label="<?php echo esc_attr( $food_english ? 'Natural, Nutrition' : 'Nutrición, Natural' ); ?>">
					<span class="site-tagline-word"><?php echo esc_html( $food_english ? 'Natural' : 'Nutrición' ); ?></span>
					<span class="site-tagline-separator" aria-hidden="true">·</span>
					<span class="site-tagline-word"><?php echo esc_html( $food_english ? 'Nutrition' : 'Natural' ); ?></span>
				</div>
			</a>
		</div>

		<nav class="primary-nav" id="primary-menu" aria-label="<?php echo esc_attr( $food_english ? 'Main menu' : 'Menú principal' ); ?>">
			<?php
			if ( $food_english && function_exists( 'food_language_nav_fallback' ) ) {
				food_language_nav_fallback();
			} else {
				wp_nav_menu( array( 'theme_location' => 'primary', 'container' => false, 'fallback_cb' => function_exists( 'food_language_nav_fallback' ) ? 'food_language_nav_fallback' : 'food_primary_nav_fallback' ) );
			}
			?>
		</nav>

		<div class="header-actions">
			<button class="language-toggle" type="button" aria-controls="language-overlay" aria-expanded="false" aria-label="<?php echo esc_attr( $food_english ? 'Change language' : 'Cambiar idioma' ); ?>">
				<span class="language-current-flag flag-<?php echo esc_attr( $food_current_language ); ?>" aria-hidden="true"></span>
			</button>
			<button class="header-search search-toggle" type="button" aria-controls="search-overlay" aria-expanded="false" aria-label="<?php echo esc_attr( $food_english ? 'Search Quinnoa' : 'Buscar en Quinnoa' ); ?>">
				<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
			</button>
			<button class="menu-toggle" type="button" aria-controls="mobile-menu-overlay" aria-expanded="false" aria-label="<?php echo esc_attr( $food_english ? 'Open menu' : 'Abrir menú' ); ?>">
				<span class="menu-toggle-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="menu-toggle-label"><?php echo esc_html( $food_english ? 'Menu' : 'Menú' ); ?></span>
			</button>
		</div>
	</div>
</header>

<div class="mobile-menu-overlay" id="mobile-menu-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="<?php echo esc_attr( $food_english ? 'Quinnoa menu' : 'Menú de Quinnoa' ); ?>">
	<div class="mobile-menu-shell">
		<div class="mobile-menu-top">
			<a class="mobile-brand" href="<?php echo esc_url( $food_home_url ); ?>" rel="home" aria-label="Quinnoa"><?php food_pometum_logo( 'is-mobile' ); ?></a>
			<button class="mobile-menu-close" type="button" aria-label="<?php echo esc_attr( $food_english ? 'Close menu' : 'Cerrar menú' ); ?>">
				<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>
			</button>
		</div>

		<div class="mobile-menu-content">
			<div class="mobile-menu-eyebrow"><?php echo esc_html( $food_english ? 'Know your food better' : 'Conoce mejor lo que comes' ); ?></div>
			<nav class="mobile-primary-nav" aria-label="<?php echo esc_attr( $food_english ? 'Mobile menu' : 'Menú móvil' ); ?>">
				<?php
				if ( $food_english && function_exists( 'food_language_nav_fallback' ) ) {
					food_language_nav_fallback();
				} else {
					wp_nav_menu( array( 'theme_location' => 'primary', 'container' => false, 'fallback_cb' => function_exists( 'food_language_nav_fallback' ) ? 'food_language_nav_fallback' : 'food_primary_nav_fallback' ) );
				}
				?>
			</nav>

			<div class="mobile-menu-explore">
				<span class="mobile-menu-explore-title"><?php echo esc_html( $food_english ? 'Explore by food' : 'Explora por alimento' ); ?></span>
				<div class="mobile-food-links">
					<?php foreach ( food_family_definitions() as $slug => $family ) : ?>
						<a href="<?php echo esc_url( food_category_url( $slug, $family['name'] ) ); ?>"><?php echo esc_html( function_exists( 'food_family_display' ) ? food_family_display( $slug ) : $family['name'] ); ?></a>
					<?php endforeach; ?>
				</div>
			</div>

			<form class="mobile-menu-search" role="search" method="get" action="<?php echo esc_url( $food_home_url ); ?>">
				<label class="screen-reader-text" for="mobile-food-search"><?php echo esc_html( $food_english ? 'Search Quinnoa' : 'Buscar en Quinnoa' ); ?></label>
				<input id="mobile-food-search" type="search" name="s" placeholder="<?php echo esc_attr( $food_english ? 'Search Quinnoa…' : 'Busca en Quinnoa…' ); ?>" value="<?php echo esc_attr( get_search_query() ); ?>">
				<button type="submit"><?php echo esc_html( $food_english ? 'Search' : 'Buscar' ); ?></button>
			</form>
			<p class="mobile-menu-note"><?php echo esc_html( $food_english ? 'A place to keep discovering what we eat.' : 'Un lugar para seguir descubriendo lo que comemos.' ); ?></p>
		</div>
	</div>
</div>

<div class="language-overlay" id="language-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="<?php echo esc_attr( $food_english ? 'Choose language' : 'Elegir idioma' ); ?>">
	<div class="language-overlay-shell">
		<div class="language-overlay-top">
			<a href="<?php echo esc_url( $food_home_url ); ?>" aria-label="Quinnoa"><?php food_pometum_logo( 'is-language-overlay' ); ?></a>
			<button class="language-overlay-close" type="button" aria-label="<?php echo esc_attr( $food_english ? 'Close language selector' : 'Cerrar selector de idioma' ); ?>">
				<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>
			</button>
		</div>

		<div class="language-overlay-content">
			<h2 class="language-overlay-title"><?php echo esc_html( $food_english ? 'Choose your edition.' : 'Elige tu edición.' ); ?></h2>
			<div class="language-options">
				<?php foreach ( $food_languages as $code => $definition ) : ?>
					<?php
					if ( $food_editorial_key && function_exists( 'food_editorial_page_url' ) ) {
						$language_url = food_editorial_page_url( $food_editorial_key, $code );
					} else {
						$language_url = function_exists( 'food_language_switch_url' ) ? food_language_switch_url( $code ) : ( 'en' === $code ? home_url( '/en/' ) : home_url( '/' ) );
					}
					$is_current = $code === $food_current_language;
					?>
					<a class="language-option" href="<?php echo esc_url( $language_url ); ?>" hreflang="<?php echo esc_attr( $code ); ?>" <?php echo $is_current ? 'aria-current="page"' : ''; ?>>
						<span class="language-option-flag flag-<?php echo esc_attr( $code ); ?>" aria-hidden="true"></span>
						<span class="language-option-copy"><span class="language-option-name"><?php echo esc_html( $definition['label'] ); ?></span></span>
						<span class="language-option-arrow" aria-hidden="true">→</span>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</div>
</div>

<div class="search-overlay" id="search-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-label="<?php echo esc_attr( $food_english ? 'Search Quinnoa' : 'Buscar en Quinnoa' ); ?>">
	<div class="search-overlay-shell">
		<div class="search-overlay-top">
			<a href="<?php echo esc_url( $food_home_url ); ?>" aria-label="Quinnoa"><?php food_pometum_logo( 'is-search-overlay' ); ?></a>
			<button class="search-overlay-close" type="button" aria-label="<?php echo esc_attr( $food_english ? 'Close search' : 'Cerrar búsqueda' ); ?>">
				<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"></path></svg>
			</button>
		</div>
		<div class="search-overlay-content">
			<h2 class="search-overlay-title"><?php echo esc_html( $food_english ? 'Search' : 'Buscar' ); ?></h2>
			<form class="search-overlay-form" role="search" method="get" action="<?php echo esc_url( $food_home_url ); ?>">
				<label class="screen-reader-text" for="overlay-food-search"><?php echo esc_html( $food_english ? 'Search Quinnoa' : 'Buscar en Quinnoa' ); ?></label>
				<input id="overlay-food-search" type="search" name="s" placeholder="<?php echo esc_attr( $food_english ? 'Type your search…' : 'Escribe tu búsqueda…' ); ?>" value="<?php echo esc_attr( get_search_query() ); ?>" autocomplete="off">
				<button type="submit"><?php echo esc_html( $food_english ? 'Search' : 'Buscar' ); ?></button>
			</form>
		</div>
	</div>
</div>

<main id="contenido" class="site-content">