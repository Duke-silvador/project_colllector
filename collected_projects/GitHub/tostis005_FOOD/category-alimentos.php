<?php
get_header();

$english = function_exists( 'food_is_english' ) && food_is_english();
?>

<div class="container archive-wrap directory-page-wrap">
	<nav class="breadcrumbs" aria-label="<?php echo esc_attr( $english ? 'Breadcrumbs' : 'Migas de pan' ); ?>">
		<a href="<?php echo esc_url( function_exists( 'food_language_home_url' ) ? food_language_home_url() : home_url( '/' ) ); ?>"><?php echo esc_html( $english ? 'Home' : 'Inicio' ); ?></a>
		<span>›</span>
		<span aria-current="page"><?php echo esc_html( $english ? 'Foods' : 'Alimentos' ); ?></span>
	</nav>

	<header class="archive-header directory-page-header">
		<div class="archive-header-copy">
			<div class="eyebrow"><?php echo esc_html( $english ? 'Browse Quinnoa' : 'Explora Quinnoa' ); ?></div>
			<h1><?php echo esc_html( $english ? 'Explore by food' : 'Explora por alimento' ); ?></h1>
			<div class="taxonomy-description">
				<p><?php echo esc_html( $english ? 'Choose a food group to see all the articles about it, whatever angle they approach it from.' : 'Elige un grupo de alimentos para ver todos los artículos relacionados con él, sea cual sea el enfoque desde el que lo tratemos.' ); ?></p>
			</div>
		</div>
	</header>

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
</div>

<?php get_footer(); ?>