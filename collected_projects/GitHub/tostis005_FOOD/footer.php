<?php
$food_english = function_exists( 'food_is_english' ) && food_is_english();
$food_footer_language = $food_english ? 'en' : 'es';
$food_cookie_policy_url = function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'cookies', $food_footer_language ) : home_url( '/politica-de-cookies/' );
$food_cookie_css = get_template_directory() . '/assets/css/quinnoa-cookie-consent.css';
$food_cookie_js  = get_template_directory() . '/assets/js/quinnoa-cookie-consent.js';
?>
</main>

<footer class="site-footer">
	<div class="container footer-main footer-main-v5">
		<div>
			<div class="pometum-footer-brand"><?php if ( function_exists( 'food_pometum_logo' ) ) { food_pometum_logo( 'is-footer' ); } else { echo esc_html( get_bloginfo( 'name' ) ?: 'Quinnoa' ); } ?></div>
			<p class="footer-copy"><?php echo esc_html( $food_english ? 'A place to understand food better and discover what lies behind what we eat.' : 'Un espacio para entender mejor los alimentos y descubrir lo que hay detrás de lo que comemos.' ); ?></p>
		</div>
		<nav aria-label="<?php echo esc_attr( $food_english ? 'Footer links' : 'Enlaces del pie' ); ?>">
			<ul class="footer-links-v5">
				<li><a href="<?php echo esc_url( function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'about', $food_footer_language ) : home_url( '/acerca-de/' ) ); ?>"><?php echo esc_html( $food_english ? 'About' : 'Acerca de' ); ?></a></li>
				<li><a href="<?php echo esc_url( function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'methodology', $food_footer_language ) : home_url( $food_english ? '/en/editorial-methodology/' : '/metodologia-editorial/' ) ); ?>"><?php echo esc_html( $food_english ? 'Editorial methodology' : 'Metodología editorial' ); ?></a></li>
				<li><a href="<?php echo esc_url( function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'contact', $food_footer_language ) : home_url( '/contacto/' ) ); ?>"><?php echo esc_html( $food_english ? 'Contact' : 'Contacto' ); ?></a></li>
				<li><a href="<?php echo esc_url( function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'privacy', $food_footer_language ) : home_url( '/privacidad/' ) ); ?>"><?php echo esc_html( $food_english ? 'Privacy' : 'Privacidad' ); ?></a></li>
				<li><a href="<?php echo esc_url( $food_cookie_policy_url ); ?>"><?php echo esc_html( $food_english ? 'Cookies' : 'Cookies' ); ?></a></li>
			</ul>
		</nav>
	</div>
	<div class="container footer-bottom">
		<span>© <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?></span>
		<span><?php echo esc_html( $food_english ? 'General educational information. Medical and food-safety advice from qualified professionals and official authorities takes priority.' : 'Información divulgativa de carácter general. En cuestiones médicas y de seguridad alimentaria prevalecen las indicaciones de profesionales cualificados y organismos oficiales.' ); ?></span>
	</div>
</footer>

<?php if ( file_exists( $food_cookie_css ) ) : ?>
	<link rel="stylesheet" href="<?php echo esc_url( get_template_directory_uri() . '/assets/css/quinnoa-cookie-consent.css?ver=' . filemtime( $food_cookie_css ) ); ?>">
<?php endif; ?>

<div class="quinnoa-cookie-banner" id="quinnoa-cookie-banner" role="region" aria-label="<?php echo esc_attr( $food_english ? 'Cookie notice' : 'Aviso de cookies' ); ?>" hidden>
	<div class="quinnoa-cookie-banner__inner">
		<p class="quinnoa-cookie-banner__copy">
			<?php if ( $food_english ) : ?>
				We use necessary cookies and, if you allow them, analytics cookies. Quinnoa also displays third-party advertising from Adsterra; see the policy for details. <a href="<?php echo esc_url( $food_cookie_policy_url ); ?>">Cookie policy</a>.
			<?php else : ?>
				Usamos cookies necesarias y, si las aceptas, cookies analíticas. Quinnoa también muestra publicidad de terceros mediante Adsterra; consulta la política para más detalles. <a href="<?php echo esc_url( $food_cookie_policy_url ); ?>">Política de cookies</a>.
			<?php endif; ?>
		</p>
		<div class="quinnoa-cookie-banner__actions">
			<button class="quinnoa-cookie-btn quinnoa-cookie-btn--link" type="button" data-quinnoa-cookie-settings><?php echo esc_html( $food_english ? 'Settings' : 'Configurar' ); ?></button>
			<button class="quinnoa-cookie-btn quinnoa-cookie-btn--secondary" type="button" data-quinnoa-cookie-reject><?php echo esc_html( $food_english ? 'Reject' : 'Rechazar' ); ?></button>
			<button class="quinnoa-cookie-btn quinnoa-cookie-btn--primary" type="button" data-quinnoa-cookie-accept><?php echo esc_html( $food_english ? 'Accept' : 'Aceptar' ); ?></button>
		</div>
	</div>
</div>

<div class="quinnoa-cookie-settings" id="quinnoa-cookie-settings" role="dialog" aria-modal="true" aria-labelledby="quinnoa-cookie-settings-title" hidden>
	<div class="quinnoa-cookie-settings__panel">
		<h2 id="quinnoa-cookie-settings-title"><?php echo esc_html( $food_english ? 'Cookie preferences' : 'Preferencias de cookies' ); ?></h2>
		<p class="quinnoa-cookie-settings__intro">
			<?php echo esc_html( $food_english ? 'Choose whether Quinnoa may use analytics cookies. Necessary cookies remain active so the site and your preference can work correctly. Advertising is not controlled by this setting.' : 'Elige si Quinnoa puede utilizar cookies analíticas. Las cookies necesarias permanecen activas para que la web y tu preferencia funcionen correctamente. La publicidad no se controla desde este ajuste.' ); ?>
			<a href="<?php echo esc_url( $food_cookie_policy_url ); ?>"><?php echo esc_html( $food_english ? 'Cookie policy' : 'Política de cookies' ); ?></a>.
		</p>
		<div class="quinnoa-cookie-setting">
			<div>
				<strong><?php echo esc_html( $food_english ? 'Necessary' : 'Necesarias' ); ?></strong>
				<p><?php echo esc_html( $food_english ? 'Required for basic site functions and to remember your cookie choice.' : 'Necesarias para funciones básicas de la web y para recordar tu elección de cookies.' ); ?></p>
			</div>
			<span class="quinnoa-cookie-setting__state"><?php echo esc_html( $food_english ? 'Always active' : 'Siempre activas' ); ?></span>
		</div>
		<div class="quinnoa-cookie-setting">
			<div>
				<strong><?php echo esc_html( $food_english ? 'Analytics' : 'Analíticas' ); ?></strong>
				<p><?php echo esc_html( $food_english ? 'Help us understand visits and site usage with Google Analytics.' : 'Nos ayudan a entender las visitas y el uso de la web mediante Google Analytics.' ); ?></p>
			</div>
			<label class="quinnoa-cookie-switch">
				<span class="screen-reader-text"><?php echo esc_html( $food_english ? 'Allow analytics cookies' : 'Permitir cookies analíticas' ); ?></span>
				<input id="quinnoa-cookie-analytics" type="checkbox" value="1">
				<span aria-hidden="true"></span>
			</label>
		</div>
		<div class="quinnoa-cookie-settings__actions">
			<button class="quinnoa-cookie-btn quinnoa-cookie-btn--secondary" type="button" data-quinnoa-cookie-close><?php echo esc_html( $food_english ? 'Cancel' : 'Cancelar' ); ?></button>
			<button class="quinnoa-cookie-btn quinnoa-cookie-btn--primary" type="button" data-quinnoa-cookie-save><?php echo esc_html( $food_english ? 'Save preferences' : 'Guardar preferencias' ); ?></button>
		</div>
	</div>
</div>

<?php wp_footer(); ?>
<?php if ( file_exists( $food_cookie_js ) ) : ?>
	<script src="<?php echo esc_url( get_template_directory_uri() . '/assets/js/quinnoa-cookie-consent.js?ver=' . filemtime( $food_cookie_js ) ); ?>"></script>
<?php endif; ?>
</body>
</html>
