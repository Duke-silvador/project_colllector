<?php
get_header();

$key      = get_query_var( 'food_editorial_page' );
$language = function_exists( 'food_current_language' ) ? food_current_language() : 'es';
$pages    = function_exists( 'food_editorial_pages' ) ? food_editorial_pages() : array();
$page     = isset( $pages[ $key ][ $language ] ) ? $pages[ $key ][ $language ] : null;

if ( $page && 'about' === $key ) {
	if ( 'en' === $language ) {
		$page['intro'] = 'Quinnoa is a digital food library for anyone who wants to understand food better. We answer specific questions with clear explanations, source references and practical context, using a shared editorial method across the site.';
		$page['sections'] = array(
			array(
				'title' => 'Food in all its variety',
				'paragraphs' => array(
					'From everyday ingredients to products with a long tradition, food can be understood from many angles. Quinnoa explores meat, fish, fruit, vegetables, legumes, grains, dairy, oils and other foods, as well as the questions that connect them.',
					'We are interested in what makes each food distinctive: its composition, origin, quality, seasonality, preservation, preparation and place in everyday cooking.',
				),
			),
			array(
				'title' => 'From origin to table',
				'paragraphs' => array(
					'Good food knowledge goes beyond nutrition labels. It also includes understanding how a product is made, how to recognize its qualities, how it changes over time and what happens to it in the kitchen.',
					'Quinnoa brings these perspectives together for curious readers who enjoy knowing more about what they eat.',
				),
			),
			array(
				'title' => 'Editorial scope',
				'paragraphs' => array(
					'Quinnoa provides general educational information about food. Its content does not replace individual medical advice, diagnosis or treatment. For health and food-safety matters, guidance from qualified professionals and competent authorities takes priority.',
				),
			),
		);
	} else {
		$page['intro'] = 'Quinnoa es una biblioteca digital sobre alimentación para quienes quieren entender mejor los alimentos. Respondemos preguntas concretas con explicaciones claras, fuentes consultables y contexto práctico, aplicando un método editorial común en toda la web.';
		$page['sections'] = array(
			array(
				'title' => 'Los alimentos en toda su variedad',
				'paragraphs' => array(
					'Desde los ingredientes de todos los días hasta productos con una larga tradición, la comida se puede conocer desde muchos ángulos. En Quinnoa hablamos de carnes, pescados, frutas, verduras, legumbres, cereales, lácteos, aceites y muchos otros alimentos, además de los temas que los conectan.',
					'Nos interesa aquello que hace diferente a cada alimento: su composición, su origen, su calidad, su temporada, su conservación, su preparación y el lugar que ocupa en la cocina cotidiana.',
				),
			),
			array(
				'title' => 'Del origen a la mesa',
				'paragraphs' => array(
					'Conocer un alimento va mucho más allá de leer una etiqueta nutricional. También significa entender cómo se elabora, cómo reconocer sus cualidades, cómo evoluciona con el tiempo y qué ocurre cuando llega a la cocina.',
					'Quinnoa reúne esas distintas miradas para quienes sienten curiosidad por saber más sobre lo que comen.',
				),
			),
			array(
				'title' => 'Alcance editorial',
				'paragraphs' => array(
					'Quinnoa ofrece información divulgativa de carácter general sobre alimentación. Sus contenidos no sustituyen el consejo médico individual, el diagnóstico ni el tratamiento. En cuestiones de salud y seguridad alimentaria, tienen prioridad las indicaciones de profesionales cualificados y organismos competentes.',
				),
			),
		);
	}
}

if ( $page && 'methodology' === $key ) {
	if ( 'en' === $language ) {
		$page['intro'] = 'This page explains how Quinnoa chooses, documents, writes and maintains its food articles so readers can understand where the information comes from and what standards we apply.';
		$page['sections'] = array(
			array(
				'title' => 'What we try to add',
				'paragraphs' => array(
					'Each article starts with a specific food question. The goal is not to repeat a definition that already exists elsewhere, but to answer the practical question behind it with enough context to make the information useful on its own.',
					'We favor concrete explanations, comparisons, limitations and practical distinctions over filler. When a topic already exists on Quinnoa, we try to extend or connect the existing coverage rather than create a second page that answers the same question.',
				),
			),
			array(
				'title' => 'Sources and verification',
				'paragraphs' => array(
					'We prefer primary, official and specialist sources when they are available: food-composition databases, food-safety and public-health authorities, scientific or technical organizations, regulations and first-party documentation relevant to the question.',
					'Key sources are listed at the end of each article so readers can check the basis for important facts. A source is selected for what it supports; a long bibliography is not treated as a substitute for a clear answer.',
				),
			),
			array(
				'title' => 'Nutrition data, comparisons and context',
				'paragraphs' => array(
					'Food values change with variety, brand, preparation and water content. When figures are compared, we try to keep the basis compatible and make relevant distinctions such as raw versus cooked food, per-100-gram values versus serving sizes, and country-specific labeling or regulatory differences.',
					'Approximate values are presented as estimates rather than false precision. When two reliable sources legitimately differ, the article should explain the reason or the range instead of hiding the difference.',
				),
			),
			array(
				'title' => 'Health and food-safety topics',
				'paragraphs' => array(
					'Quinnoa provides general educational information, not individualized medical advice. For health, allergens, pregnancy, food safety and other higher-stakes questions, official authorities and qualified professional guidance take priority.',
					'We avoid presenting an association as proof of cause, a general recommendation as a personal prescription, or an uncertain threshold as an absolute guarantee of safety.',
				),
			),
			array(
				'title' => 'Editorial tools and quality controls',
				'paragraphs' => array(
					'Quinnoa uses digital tools and automation to support parts of the editorial workflow, including drafting, consistency checks and large-scale quality control. Automation is a tool in the process, not a reason to publish a page.',
					'Article files are checked for minimum useful depth, structure, bilingual consistency, source fields and overlapping comparison patterns before or during publication. These automated checks complement editorial judgment; they do not turn a passing score into proof that an article is perfect.',
				),
			),
			array(
				'title' => 'Authorship, updates and corrections',
				'paragraphs' => array(
					'Articles are published under the editorial responsibility of Quinnoa rather than under invented individual expert profiles. We do not claim medical, dietetic or scientific credentials that are not actually part of the project.',
					'When an article needs a factual correction, clearer wording or updated regulatory context, we prefer to improve the existing page. Readers can report a possible error through the Contact page.',
				),
			),
		);
	} else {
		$page['intro'] = 'Esta página explica cómo Quinnoa selecciona, documenta, redacta y mantiene sus artículos sobre alimentación para que el lector pueda saber de dónde sale la información y qué criterios aplicamos.';
		$page['sections'] = array(
			array(
				'title' => 'Qué intentamos aportar',
				'paragraphs' => array(
					'Cada artículo parte de una pregunta concreta sobre alimentación. El objetivo no es repetir una definición disponible en cualquier otra web, sino resolver la duda práctica que hay detrás con suficiente contexto para que la respuesta sea útil por sí sola.',
					'Priorizamos explicaciones concretas, comparaciones, límites y matices prácticos frente al relleno. Cuando un tema ya existe en Quinnoa, intentamos ampliar o conectar la cobertura existente en lugar de crear otra página que responda esencialmente a la misma pregunta.',
				),
			),
			array(
				'title' => 'Fuentes y verificación',
				'paragraphs' => array(
					'Priorizamos fuentes primarias, oficiales y especializadas cuando están disponibles: bases de composición de alimentos, autoridades de seguridad alimentaria y salud pública, organismos científicos o técnicos, normativa y documentación de primera parte pertinente para la pregunta.',
					'Las fuentes principales se muestran al final de cada artículo para que el lector pueda comprobar la base de los datos importantes. Elegimos una fuente por lo que respalda; una bibliografía larga no sustituye a una respuesta clara.',
				),
			),
			array(
				'title' => 'Datos nutricionales, comparaciones y contexto',
				'paragraphs' => array(
					'Los valores de un alimento cambian según variedad, marca, preparación y contenido de agua. Cuando comparamos cifras intentamos mantener una base compatible y distinguir, cuando importa, entre alimento crudo y cocinado, valores por 100 gramos y por ración, y diferencias de etiquetado o regulación entre países.',
					'Las cifras aproximadas se presentan como estimaciones y no con una falsa precisión. Cuando dos fuentes fiables difieren de forma legítima, el artículo debe explicar la causa o el intervalo en lugar de ocultar la diferencia.',
				),
			),
			array(
				'title' => 'Salud y seguridad alimentaria',
				'paragraphs' => array(
					'Quinnoa ofrece información divulgativa general, no consejo médico individualizado. En cuestiones de salud, alérgenos, embarazo, seguridad alimentaria y otros temas de mayor impacto, tienen prioridad las autoridades oficiales y las indicaciones de profesionales cualificados.',
					'Evitamos presentar una asociación como prueba de causalidad, una recomendación general como prescripción personal o un umbral incierto como una garantía absoluta de seguridad.',
				),
			),
			array(
				'title' => 'Herramientas editoriales y controles de calidad',
				'paragraphs' => array(
					'Quinnoa utiliza herramientas digitales y automatización como apoyo en partes del flujo editorial, incluida la preparación de borradores, las comprobaciones de coherencia y los controles de calidad a gran escala. La automatización es una herramienta del proceso, no una razón para publicar una página.',
					'Los ficheros de artículos se comprueban en aspectos como profundidad mínima útil, estructura, coherencia bilingüe, campos de fuentes y patrones de comparación antes o durante la publicación. Estos controles automáticos complementan el criterio editorial; superar un test no convierte por sí solo un artículo en perfecto.',
				),
			),
			array(
				'title' => 'Autoría, actualizaciones y correcciones',
				'paragraphs' => array(
					'Los artículos se publican bajo la responsabilidad editorial de Quinnoa, en lugar de atribuirlos a perfiles individuales de expertos inventados. No atribuimos al proyecto credenciales médicas, dietéticas o científicas que no formen parte realmente de él.',
					'Cuando un artículo necesita una corrección factual, una explicación más clara o contexto regulatorio actualizado, preferimos mejorar la página existente. Cualquier lector puede comunicar un posible error mediante la página de Contacto.',
				),
			),
		);
	}
}

if ( $page && 'contact' === $key ) {
	$page['intro']    = 'en' === $language ? 'You can contact us using the form below.' : 'Puedes ponerte en contacto con nosotros a través del siguiente formulario.';
	$page['sections'] = array();
}

if ( $page && 'privacy' === $key ) {
	if ( 'en' === $language ) {
		$page['intro'] = 'This policy explains how personal information, analytics and cookies are handled on Quinnoa. Last updated: September 25, 2026.';
		$page['sections'] = array(
			array(
				'title' => 'Contact information',
				'paragraphs' => array(
					'Quinnoa is the editorial name of this website. Privacy and data-protection enquiries can be sent through the Contact page.',
				),
			),
			array(
				'title' => 'Personal information',
				'paragraphs' => array(
					'When you use the contact form, we receive the name, email address and message you provide. We use this information only to manage and respond to your communication.',
					'The website and its hosting infrastructure may also generate technical records needed for security and operation, such as IP address, browser information, date and requested pages.',
				),
			),
			array(
				'title' => 'Retention and service providers',
				'paragraphs' => array(
					'Contact messages are retained only for as long as reasonably necessary to manage the correspondence and related administrative needs. Personal information submitted through the contact form is not sold.',
					'Hosting, email and other technical providers may process information to the extent required to provide their services and keep the website available and secure.',
				),
			),
			array(
				'title' => 'Cookies',
				'paragraphs' => array(
					'The site uses preference cookies for language and analytics choices. Google Analytics is configured with analytics storage denied by default and can use analytics storage only after the visitor grants that preference. Pages may also load Adsterra advertising code independently of the analytics preference; Adsterra and advertising partners may use third-party advertising technologies as described in the Cookie policy.',
				),
			),
			array(
				'title' => 'Your rights',
				'paragraphs' => array(
					'Where applicable, you may request access, correction, deletion, restriction, objection or portability of your personal information through the Contact page. In Spain, you may also lodge a complaint with the Spanish Data Protection Agency.',
				),
			),
		);
	} else {
		$page['intro'] = 'Esta política explica cómo se tratan los datos personales, la analítica y las cookies en Quinnoa. Última actualización: 25 de septiembre de 2026.';
		$page['sections'] = array(
			array(
				'title' => 'Contacto en materia de privacidad',
				'paragraphs' => array(
					'Quinnoa es la denominación editorial de este sitio web. Las consultas relacionadas con privacidad y protección de datos pueden enviarse a través de la página de Contacto.',
				),
			),
			array(
				'title' => 'Datos personales',
				'paragraphs' => array(
					'Cuando utilizas el formulario de contacto recibimos el nombre, la dirección de correo electrónico y el mensaje que facilitas. Estos datos se utilizan únicamente para gestionar y responder la comunicación.',
					'El sitio web y su infraestructura de alojamiento también pueden generar registros técnicos necesarios para su seguridad y funcionamiento, como la dirección IP, información del navegador, la fecha y las páginas solicitadas.',
				),
			),
			array(
				'title' => 'Conservación y proveedores',
				'paragraphs' => array(
					'Los mensajes de contacto se conservan únicamente durante el tiempo razonablemente necesario para gestionar la comunicación y las necesidades administrativas relacionadas. Los datos personales enviados mediante el formulario no se venden.',
					'Los proveedores de alojamiento, correo y otros servicios técnicos pueden tratar información en la medida necesaria para prestar sus servicios y mantener el sitio disponible y seguro.',
				),
			),
			array(
				'title' => 'Cookies',
				'paragraphs' => array(
					'El sitio utiliza cookies de preferencia para idioma y elección de analítica. Google Analytics está configurado con el almacenamiento analítico denegado por defecto y solo puede recibir permiso de almacenamiento analítico después de que el visitante lo acepte. Las páginas también pueden cargar código publicitario de Adsterra independientemente de la preferencia de analítica; Adsterra y sus socios publicitarios pueden utilizar tecnologías publicitarias de terceros según se describe en la Política de cookies.',
				),
			),
			array(
				'title' => 'Tus derechos',
				'paragraphs' => array(
					'Cuando corresponda, puedes solicitar el acceso, rectificación, supresión, oposición, limitación o portabilidad de tus datos personales a través de la página de Contacto. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos.',
				),
			),
		);
	}
}

if ( ! $page ) {
	status_header( 404 );
	?>
	<div class="editorial-page-shell"><p><?php echo esc_html( 'en' === $language ? 'Page not found.' : 'Página no encontrada.' ); ?></p></div>
	<?php
	get_footer();
	return;
}
?>

<div class="editorial-page-shell">
	<nav class="breadcrumbs" aria-label="<?php echo esc_attr( 'en' === $language ? 'Breadcrumbs' : 'Migas de pan' ); ?>">
		<a href="<?php echo esc_url( function_exists( 'food_language_home_url' ) ? food_language_home_url( $language ) : home_url( '/' ) ); ?>"><?php echo esc_html( 'en' === $language ? 'Home' : 'Inicio' ); ?></a>
		<span aria-hidden="true">›</span>
		<span aria-current="page"><?php echo esc_html( $page['title'] ); ?></span>
	</nav>

	<header class="editorial-page-header">
		<h1><?php echo esc_html( $page['title'] ); ?></h1>
		<?php if ( ! empty( $page['intro'] ) ) : ?><p><?php echo esc_html( $page['intro'] ); ?></p><?php endif; ?>
	</header>

	<div class="editorial-page-content">
		<?php foreach ( $page['sections'] as $section ) : ?>
			<section>
				<h2><?php echo esc_html( $section['title'] ); ?></h2>
				<?php foreach ( $section['paragraphs'] as $paragraph ) : ?>
					<p><?php echo esc_html( $paragraph ); ?></p>
				<?php endforeach; ?>
				<?php if ( ! empty( $section['items'] ) ) : ?>
					<ul>
						<?php foreach ( $section['items'] as $item ) : ?><li><?php echo esc_html( $item ); ?></li><?php endforeach; ?>
					</ul>
				<?php endif; ?>
			</section>
		<?php endforeach; ?>

		<?php if ( 'contact' === $key ) : ?>
			<section>
				<h2><?php echo esc_html( 'en' === $language ? 'Send a message' : 'Enviar un mensaje' ); ?></h2>
				<?php $contact_status = isset( $_GET['contact'] ) ? sanitize_key( wp_unslash( $_GET['contact'] ) ) : ''; ?>
				<?php if ( 'sent' === $contact_status ) : ?>
					<p class="contact-notice"><?php echo esc_html( 'en' === $language ? 'Your message has been sent. Thank you.' : 'Tu mensaje se ha enviado. Gracias.' ); ?></p>
				<?php elseif ( 'error' === $contact_status ) : ?>
					<p class="contact-notice"><?php echo esc_html( 'en' === $language ? 'We could not send the message. Check the fields and try again.' : 'No hemos podido enviar el mensaje. Revisa los campos e inténtalo de nuevo.' ); ?></p>
				<?php endif; ?>
				<form class="pometum-contact-form" method="post" action="<?php echo esc_url( food_editorial_page_url( 'contact', $language ) ); ?>">
					<?php wp_nonce_field( 'food_contact', 'food_contact_nonce' ); ?>
					<label><?php echo esc_html( 'en' === $language ? 'Name' : 'Nombre' ); ?><input type="text" name="name" autocomplete="name" required></label>
					<label><?php echo esc_html( 'en' === $language ? 'Email' : 'Correo electrónico' ); ?><input type="email" name="email" autocomplete="email" required></label>
					<label><?php echo esc_html( 'en' === $language ? 'Message' : 'Mensaje' ); ?><textarea name="message" required></textarea></label>
					<label class="screen-reader-text" aria-hidden="true">Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
					<button type="submit"><?php echo esc_html( 'en' === $language ? 'Send message' : 'Enviar mensaje' ); ?></button>
				</form>
			</section>
		<?php endif; ?>
	</div>
</div>

<?php get_footer(); ?>