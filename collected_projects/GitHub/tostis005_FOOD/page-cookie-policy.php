<?php
get_header();

$language = function_exists( 'food_current_language' ) ? food_current_language() : 'es';
$english  = 'en' === $language;
$home_url = function_exists( 'food_language_home_url' ) ? food_language_home_url( $language ) : home_url( '/' );
$contact  = function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'contact', $language ) : home_url( $english ? '/en/contact/' : '/contacto/' );
$title    = $english ? 'Cookie policy' : 'Política de cookies';
?>

<div class="editorial-page-shell">
	<nav class="breadcrumbs" aria-label="<?php echo esc_attr( $english ? 'Breadcrumbs' : 'Migas de pan' ); ?>">
		<a href="<?php echo esc_url( $home_url ); ?>"><?php echo esc_html( $english ? 'Home' : 'Inicio' ); ?></a>
		<span aria-hidden="true">›</span>
		<span aria-current="page"><?php echo esc_html( $title ); ?></span>
	</nav>

	<header class="editorial-page-header">
		<h1><?php echo esc_html( $title ); ?></h1>
		<p><?php echo esc_html( $english
			? 'This policy explains which cookies Quinnoa uses, why they are used and how you can manage them. Last updated: September 25, 2026.'
			: 'Esta política explica qué cookies utiliza Quinnoa, para qué se usan y cómo puedes gestionarlas. Última actualización: 25 de septiembre de 2026.' ); ?></p>
	</header>

	<div class="editorial-page-content">
		<section>
			<h2><?php echo esc_html( $english ? 'What a cookie is' : 'Qué es una cookie' ); ?></h2>
			<p><?php echo esc_html( $english
				? 'A cookie is a small file that a website can store in the browser to remember information between visits. Depending on their purpose, cookies may be used for technical functions, preferences, measurement or advertising.'
				: 'Una cookie es un pequeño archivo que un sitio web puede guardar en el navegador para recordar información entre visitas. Según su finalidad, las cookies pueden utilizarse para funciones técnicas, preferencias, medición o publicidad.' ); ?></p>
		</section>

		<section>
			<h2><?php echo esc_html( $english ? 'Cookies, measurement and advertising used by Quinnoa' : 'Cookies, medición y publicidad utilizadas por Quinnoa' ); ?></h2>
			<p><?php echo esc_html( $english
				? 'Quinnoa uses two first-party preference cookies: one to remember the language you explicitly select and another to remember your analytics-cookie choice. Google Analytics is configured with analytics storage denied by default and is only granted analytics storage if you allow analytics cookies. Adsterra advertising placements load independently of this analytics preference.'
				: 'Quinnoa utiliza dos cookies propias de preferencia: una para recordar el idioma que eliges expresamente y otra para recordar tu elección sobre cookies analíticas. Google Analytics está configurado con el almacenamiento analítico denegado por defecto y solo recibe permiso de almacenamiento analítico si permites cookies analíticas. Los espacios publicitarios de Adsterra se cargan independientemente de esta preferencia de analítica.' ); ?></p>
			<ul>
				<li><strong>quinnoa_language</strong> — <?php echo esc_html( $english
					? 'Provider: Quinnoa. Purpose: remember Spanish or English after an explicit language choice. Duration: 6 months.'
					: 'Proveedor: Quinnoa. Finalidad: recordar español o inglés después de una elección expresa de idioma. Duración: 6 meses.' ); ?></li>
				<li><strong>quinnoa_cookie_consent_v2</strong> — <?php echo esc_html( $english
					? 'Provider: Quinnoa. Purpose: remember your analytics-cookie choice. Duration: 12 months.'
					: 'Proveedor: Quinnoa. Finalidad: recordar tu elección sobre cookies analíticas. Duración: 12 meses.' ); ?></li>
			</ul>
			<p><?php echo esc_html( $english
				? 'Quinnoa loads Adsterra advertising code when pages with advertising placements are viewed. Adsterra and the advertising partners involved in delivering an ad may use cookies, local storage, pixels or similar technologies according to the ad configuration and their own policies. The Quinnoa analytics-cookie preference does not block these third-party advertising technologies.'
				: 'Quinnoa carga código publicitario de Adsterra al visitar páginas que contienen espacios publicitarios. Adsterra y los socios publicitarios que intervienen en la entrega de un anuncio pueden utilizar cookies, almacenamiento local, píxeles o tecnologías similares según la configuración del anuncio y sus propias políticas. La preferencia de cookies analíticas de Quinnoa no bloquea estas tecnologías publicitarias de terceros.' ); ?></p>
		</section>
		<section>
			<h2><?php echo esc_html( $english ? 'Browser-language detection' : 'Detección del idioma del navegador' ); ?></h2>
			<p><?php echo esc_html( $english
				? 'If there is no saved language preference and you enter through the Spanish home page, Quinnoa may use the Accept-Language information sent by your browser to choose between the Spanish and English home pages. This check is used for that request and does not itself create the language cookie.'
				: 'Si no existe una preferencia de idioma guardada y entras por la portada en español, Quinnoa puede utilizar la información Accept-Language que envía tu navegador para elegir entre la portada en español y la portada en inglés. Esta comprobación se usa para esa petición y no crea por sí misma la cookie de idioma.' ); ?></p>
			<p><?php echo esc_html( $english
				? 'Once you select a language from the Quinnoa language selector, your explicit choice takes priority over automatic browser-language detection.'
				: 'Cuando eliges un idioma desde el selector de Quinnoa, tu elección expresa pasa a tener prioridad sobre la detección automática del navegador.' ); ?></p>
		</section>

		<section>
			<h2><?php echo esc_html( $english ? 'Why this preference does not require a cookie banner' : 'Por qué esta preferencia no requiere un banner de cookies' ); ?></h2>
			<p><?php echo esc_html( $english
				? 'The Spanish Data Protection Agency guidance treats a language-preference cookie as exempt from prior consent when the user personally chooses that preference and the cookie is used exclusively to provide the requested setting. Quinnoa limits this cookie to that purpose.'
				: 'La guía de la Agencia Española de Protección de Datos considera exenta de consentimiento previo una cookie de preferencia de idioma cuando es el propio usuario quien elige esa configuración y la cookie se utiliza exclusivamente para prestar la preferencia solicitada. Quinnoa limita esta cookie a esa finalidad.' ); ?></p>
			<p>
				<a href="https://www.aepd.es/guias/guia-cookies.pdf" rel="noopener noreferrer" target="_blank"><?php echo esc_html( $english ? 'Spanish Data Protection Agency cookie guidance' : 'Guía sobre el uso de las cookies de la AEPD' ); ?></a>
			</p>
		</section>

		<section>
			<h2><?php echo esc_html( $english ? 'How to manage or delete your preferences' : 'Cómo gestionar o eliminar tus preferencias' ); ?></h2>
			<p><?php echo esc_html( $english
				? 'You can change the saved language at any time from the Quinnoa language selector and adjust the analytics choice from Cookie settings. You can also delete Quinnoa cookies in your browser. If the consent cookie is deleted, the site will ask for your analytics preference again.'
				: 'Puedes cambiar el idioma guardado en cualquier momento desde el selector de Quinnoa y ajustar la opción de analítica desde la configuración de Cookies. También puedes eliminar las cookies de Quinnoa en tu navegador. Si eliminas la cookie de consentimiento, la web volverá a pedirte tu preferencia de analítica.' ); ?></p>
		</section>

		<section>
			<h2><?php echo esc_html( $english ? 'Advertising and third-party technologies' : 'Publicidad y tecnologías de terceros' ); ?></h2>
			<p><?php echo esc_html( $english
				? 'Advertising placements are part of the normal page delivery on Quinnoa and are not controlled by the analytics-cookie switch. Browser privacy settings, content blockers and controls offered by advertising providers may affect whether third-party advertising technologies can operate.'
				: 'Los espacios publicitarios forman parte de la entrega normal de las páginas de Quinnoa y no se controlan mediante el interruptor de cookies analíticas. La configuración de privacidad del navegador, los bloqueadores de contenido y los controles ofrecidos por los proveedores publicitarios pueden afectar al funcionamiento de tecnologías publicitarias de terceros.' ); ?></p>
			<p><?php echo esc_html( $english ? 'For questions about this policy, use the Contact page.' : 'Para cualquier consulta sobre esta política, utiliza la página de Contacto.' ); ?> <a href="<?php echo esc_url( $contact ); ?>"><?php echo esc_html( $english ? 'Contact' : 'Contacto' ); ?></a>.</p>
		</section>
	</div>
</div>

<?php get_footer(); ?>
