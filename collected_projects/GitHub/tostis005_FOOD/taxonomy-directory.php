<?php
get_header();

$english   = function_exists( 'food_is_english' ) && food_is_english();
$directory = get_query_var( 'food_directory' );
$is_foods  = 'foods' === $directory;

$topic_descriptions_en = array(
	'nutricion-composicion' => 'Protein, fats, carbohydrates, fiber, calories, vitamins and minerals with useful context.',
	'rankings-mejores-fuentes' => 'Practical rankings that compare foods using a clear nutritional or quality criterion.',
	'comparativas' => 'Side-by-side differences between foods, varieties, formats and cooking methods.',
	'seguridad-alimentaria' => 'How to judge food safety, reduce risk and know when food should be discarded.',
	'conservacion-almacenamiento' => 'How long food keeps and the best way to store it in the fridge, pantry or containers.',
	'congelacion-descongelacion' => 'What can be frozen, how long it keeps and how to thaw it safely.',
	'cocina-ciencia-alimentos' => 'What happens inside food when it is heated, mixed or transformed during cooking.',
	'preparacion-tecnicas-cocina' => 'Methods, temperatures and techniques for more reliable cooking results.',
	'salud-consumo-habitual' => 'How different foods fit into everyday eating patterns and regular consumption.',
	'conceptos-nutricion' => 'Clear explanations of protein, fiber, energy density and other nutrition fundamentals.',
	'mitos-preguntas-frecuentes' => 'Direct answers to common questions and popular claims about food and nutrition.',
	'procesamiento-produccion-elaboracion' => 'How food is produced, processed, fermented, cured and manufactured.',
	'compra-calidad-maduracion' => 'How to choose food, recognize quality, understand ripeness and read useful signals.',
);

$page_label = $is_foods ? ( $english ? 'Foods' : 'Alimentos' ) : ( $english ? 'Topics' : 'Temas' );
$page_title = $is_foods ? ( $english ? 'Explore by food' : 'Explora por alimento' ) : ( $english ? 'Explore by topic' : 'Explora por tema' );
$page_intro = $is_foods
	? ( $english ? 'Quinnoa content grouped by food family.' : 'Contenidos de Quinnoa agrupados por familias de alimentos.' )
	: ( $english ? 'Quinnoa content grouped by topic.' : 'Contenidos de Quinnoa agrupados por temas.' );
?>

<div class="container archive-wrap directory-page-wrap">
	<nav class="breadcrumbs" aria-label="<?php echo esc_attr( $english ? 'Breadcrumbs' : 'Migas de pan' ); ?>">
		<a href="<?php echo esc_url( function_exists( 'food_language_home_url' ) ? food_language_home_url() : home_url( '/' ) ); ?>"><?php echo esc_html( $english ? 'Home' : 'Inicio' ); ?></a>
		<span>›</span>
		<span aria-current="page"><?php echo esc_html( $page_label ); ?></span>
	</nav>

	<header class="archive-header directory-page-header">
		<div class="archive-header-copy">
			<div class="eyebrow"><?php echo esc_html( $english ? 'Browse Quinnoa' : 'Explora Quinnoa' ); ?></div>
			<h1><?php echo esc_html( $page_title ); ?></h1>
			<div class="taxonomy-description"><p><?php echo esc_html( $page_intro ); ?></p></div>
		</div>
	</header>

	<?php if ( $is_foods ) : ?>
		<section class="section food-families-section directory-page-section">
			<div class="food-family-grid">
				<?php foreach ( food_family_definitions() as $slug => $family ) : ?>
					<a class="food-family-card family-<?php echo esc_attr( $slug ); ?>" href="<?php echo esc_url( food_category_url( $slug, $family['name'] ) ); ?>">
						<span class="food-family-art" aria-hidden="true"><?php echo food_category_icon_svg( $slug ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
						<span class="food-family-content">
							<strong><?php echo esc_html( function_exists( 'food_family_display' ) ? food_family_display( $slug ) : $family['name'] ); ?></strong>
							<small><?php echo esc_html( function_exists( 'food_family_display' ) ? food_family_display( $slug, 'short' ) : $family['short'] ); ?></small>
						</span>
						<span class="food-family-arrow" aria-hidden="true">↗</span>
					</a>
				<?php endforeach; ?>
			</div>
		</section>
	<?php else : ?>
		<section class="section topic-directory-section directory-page-section">
			<div class="topic-card-grid">
				<?php foreach ( food_topic_definitions() as $slug => $topic ) : ?>
					<a class="topic-card topic-<?php echo esc_attr( $slug ); ?>" href="<?php echo esc_url( food_topic_url( $slug, $topic['name'] ) ); ?>">
						<span class="topic-card-art" aria-hidden="true"><?php echo food_topic_icon_svg( $slug ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
						<span class="topic-card-copy">
							<strong><?php echo esc_html( function_exists( 'food_topic_display' ) ? food_topic_display( $slug ) : $topic['name'] ); ?></strong>
							<small><?php echo esc_html( $english && isset( $topic_descriptions_en[ $slug ] ) ? $topic_descriptions_en[ $slug ] : $topic['description'] ); ?></small>
							<span class="topic-card-arrow" aria-hidden="true">↗</span>
						</span>
					</a>
				<?php endforeach; ?>
			</div>
		</section>
	<?php endif; ?>
</div>

<?php get_footer(); ?>
