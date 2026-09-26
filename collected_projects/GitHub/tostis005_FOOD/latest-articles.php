<?php
get_header();

$english      = function_exists( 'food_is_english' ) && food_is_english();
$current_page = max( 1, (int) get_query_var( 'paged' ) );
$query_args   = array(
	'post_type'            => 'post',
	'post_status'          => 'publish',
	'posts_per_page'       => 12,
	'paged'                => $current_page,
	'orderby'              => 'date',
	'order'                => 'DESC',
	'ignore_sticky_posts'  => true,
	'food_language_bypass' => 1,
);
if ( function_exists( 'food_language_query_clause' ) ) {
	$query_args['meta_query'] = array( food_language_query_clause() );
}
$latest_query = new WP_Query( $query_args );
$base_url     = function_exists( 'food_directory_url' ) ? food_directory_url( 'latest' ) : home_url( '/articulos/' );
?>

<div class="container archive-wrap latest-articles-page">
	<nav class="breadcrumbs" aria-label="<?php echo esc_attr( $english ? 'Breadcrumbs' : 'Migas de pan' ); ?>">
		<a href="<?php echo esc_url( function_exists( 'food_language_home_url' ) ? food_language_home_url() : home_url( '/' ) ); ?>"><?php echo esc_html( $english ? 'Home' : 'Inicio' ); ?></a>
		<span>›</span>
		<span aria-current="page"><?php echo esc_html( $english ? 'Latest articles' : 'Últimos artículos' ); ?></span>
	</nav>

	<header class="archive-header latest-articles-header">
		<div class="archive-header-copy">
			<div class="eyebrow"><?php echo esc_html( $english ? 'Quinnoa articles' : 'Artículos de Quinnoa' ); ?></div>
			<h1><?php echo esc_html( $english ? 'Latest articles' : 'Últimos artículos' ); ?></h1>
			<div class="taxonomy-description">
				<p><?php echo esc_html( $english ? 'All Quinnoa articles in one place.' : 'Todos los artículos de Quinnoa en un solo lugar.' ); ?></p>
			</div>
			<div class="search-panel latest-articles-search">
				<?php get_search_form(); ?>
			</div>
		</div>
	</header>

	<?php if ( $latest_query->have_posts() ) : ?>
		<div class="card-grid">
			<?php while ( $latest_query->have_posts() ) : $latest_query->the_post(); get_template_part( 'template-parts/card' ); endwhile; ?>
		</div>
		<?php
		$pagination = paginate_links(
			array(
				'base'      => trailingslashit( $base_url ) . '%_%',
				'format'    => 'page/%#%/',
				'current'   => $current_page,
				'total'     => max( 1, (int) $latest_query->max_num_pages ),
				'end_size'  => 2,
				'mid_size'  => 3,
				'prev_text' => $english ? '← Previous' : '← Anterior',
				'next_text' => $english ? 'Next →' : 'Siguiente →',
			)
		);
		if ( $pagination ) : ?>
			<nav class="pagination nav-links" aria-label="<?php echo esc_attr( $english ? 'Article pagination' : 'Paginación de artículos' ); ?>"><?php echo wp_kses_post( $pagination ); ?></nav>
		<?php endif; ?>
		<?php wp_reset_postdata(); ?>
	<?php else : ?>
		<div class="answer-box">
			<strong><?php echo esc_html( $english ? 'No articles found' : 'No hay artículos' ); ?></strong>
			<p><?php echo esc_html( $english ? 'There are no published articles in this language yet.' : 'Todavía no hay artículos publicados en este idioma.' ); ?></p>
		</div>
	<?php endif; ?>
</div>

<?php get_footer(); ?>
