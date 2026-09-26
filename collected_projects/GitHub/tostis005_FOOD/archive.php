<?php get_header(); ?>

<?php
$food_english   = function_exists( 'food_is_english' ) && food_is_english();
$archive_visual = ( is_category() || is_tax( 'food_topic' ) ) && function_exists( 'food_get_term_visual_context' )
	? food_get_term_visual_context()
	: null;
$archive_term   = ( is_category() || is_tax( 'food_topic' ) ) ? get_queried_object() : null;
$food_loop      = $GLOBALS['wp_query'];
$current_page   = max( 1, (int) get_query_var( 'paged' ) );
$page_size      = 12;

// Build paginated article listings explicitly so every card-based archive uses
// the same 12-item rhythm, independently of the global WordPress setting.
if ( $archive_term instanceof WP_Term && ( is_category() || is_tax( 'food_topic' ) ) ) {
	$archive_args = array(
		'post_type'            => 'post',
		'post_status'          => 'publish',
		'posts_per_page'       => $page_size,
		'paged'                => $current_page,
		'ignore_sticky_posts'  => true,
		'food_language_bypass' => 1,
	);

	if ( is_category() && 'alimentacion-general' === $archive_term->slug ) {
		// General imported articles deliberately used the parent Alimentos term in
		// earlier imports. Their canonical family meta is empty, so include them here.
		$archive_args['meta_query'] = array(
			'relation' => 'AND',
			function_exists( 'food_language_query_clause' ) ? food_language_query_clause() : array(),
			array(
				'relation' => 'OR',
				array( 'key' => '_food_food_family', 'value' => '', 'compare' => '=' ),
				array( 'key' => '_food_food_family', 'compare' => 'NOT EXISTS' ),
			),
		);
	} else {
		$archive_args['tax_query'] = array(
			array(
				'taxonomy'         => $archive_term->taxonomy,
				'field'            => 'term_id',
				'terms'            => array( (int) $archive_term->term_id ),
				'include_children' => is_category(),
			),
		);
		if ( function_exists( 'food_language_query_clause' ) ) {
			$archive_args['meta_query'] = array( food_language_query_clause() );
		}
	}

	$food_loop = new WP_Query( $archive_args );
} elseif ( is_search() ) {
	$archive_args = array(
		'post_type'            => 'post',
		'post_status'          => 'publish',
		'posts_per_page'       => $page_size,
		'paged'                => $current_page,
		's'                    => get_search_query(),
		'ignore_sticky_posts'  => true,
		'food_language_bypass' => 1,
	);
	if ( function_exists( 'food_language_query_clause' ) ) {
		$archive_args['meta_query'] = array( food_language_query_clause() );
	}
	$food_loop = new WP_Query( $archive_args );
} elseif ( is_home() ) {
	$archive_args = array(
		'post_type'            => 'post',
		'post_status'          => 'publish',
		'posts_per_page'       => $page_size,
		'paged'                => $current_page,
		'ignore_sticky_posts'  => true,
		'food_language_bypass' => 1,
	);
	if ( function_exists( 'food_language_query_clause' ) ) {
		$archive_args['meta_query'] = array( food_language_query_clause() );
	}
	$food_loop = new WP_Query( $archive_args );
}
?>

<div class="container archive-wrap">
	<?php function_exists( 'food_language_breadcrumbs' ) ? food_language_breadcrumbs() : food_breadcrumbs(); ?>
	<header class="archive-header <?php echo $archive_visual ? 'has-taxonomy-visual' : ''; ?>">
		<div class="archive-header-copy">
			<div class="eyebrow">
				<?php
				if ( is_search() ) {
					echo esc_html( $food_english ? 'Results' : 'Resultados' );
				} elseif ( is_tax( 'food_topic' ) ) {
					echo esc_html( $food_english ? 'Articles by topic' : 'Artículos por tema' );
				} elseif ( is_category() ) {
					echo esc_html( $food_english ? 'Articles by food' : 'Artículos por alimento' );
				} else {
					echo esc_html( $food_english ? 'Archive' : 'Archivo' );
				}
				?>
			</div>
			<h1>
				<?php
				if ( is_search() ) {
					printf( esc_html( $food_english ? 'Results for “%s”' : 'Resultados para “%s”' ), esc_html( get_search_query() ) );
				} elseif ( is_category() && $archive_term instanceof WP_Term ) {
					echo esc_html( function_exists( 'food_family_display' ) ? food_family_display( $archive_term->slug ) : $archive_term->name );
				} elseif ( is_tax( 'food_topic' ) && $archive_term instanceof WP_Term ) {
					echo esc_html( function_exists( 'food_topic_display' ) ? food_topic_display( $archive_term ) : $archive_term->name );
				} elseif ( is_tag() ) {
					single_tag_title();
				} else {
					the_archive_title();
				}
				?>
			</h1>
			<?php
			$archive_description = $archive_term instanceof WP_Term && function_exists( 'food_taxonomy_archive_description' )
				? food_taxonomy_archive_description( $archive_term, $food_english ? 'en' : 'es' )
				: trim( wp_strip_all_tags( term_description() ) );
			if ( ( is_category() || is_tax( 'food_topic' ) ) && $archive_description ) : ?>
				<div class="taxonomy-description"><p><?php echo esc_html( $archive_description ); ?></p></div>
			<?php endif; ?>
		</div>

		<?php if ( $archive_visual ) : ?>
			<div class="taxonomy-hero-visual <?php echo esc_attr( $archive_visual['class'] ); ?>" aria-hidden="true">
				<?php echo $archive_visual['svg']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
			</div>
		<?php endif; ?>
	</header>

	<?php
	if ( 1 === $current_page && $archive_term instanceof WP_Term && ( is_category() || is_tax( 'food_topic' ) ) ) :
		$archive_count = isset( $food_loop->found_posts ) ? (int) $food_loop->found_posts : 0;
		$cross_links   = function_exists( 'food_taxonomy_cross_links' ) ? food_taxonomy_cross_links( $archive_term, $food_english ? 'en' : 'es', 6 ) : array();
		$archive_name  = is_category()
			? ( function_exists( 'food_family_display' ) ? food_family_display( $archive_term->slug ) : $archive_term->name )
			: ( function_exists( 'food_topic_display' ) ? food_topic_display( $archive_term ) : $archive_term->name );
	?>
		<section class="taxonomy-hub-context" aria-labelledby="taxonomy-hub-title">
			<div class="taxonomy-hub-context__copy">
				<span class="section-label"><?php echo esc_html( $food_english ? 'Inside the library' : 'Dentro de la biblioteca' ); ?></span>
				<h2 id="taxonomy-hub-title"><?php echo esc_html( $food_english ? 'Explore this collection with more context' : 'Explora esta colección con más contexto' ); ?></h2>
				<p>
					<?php
					if ( $food_english ) {
						printf(
							esc_html( _n( 'Quinnoa currently groups %1$s article under %2$s.', 'Quinnoa currently groups %1$s articles under %2$s.', $archive_count, 'food' ) ),
							esc_html( number_format_i18n( $archive_count ) ),
							esc_html( $archive_name )
						);
					} else {
						printf(
							esc_html( _n( 'Quinnoa reúne actualmente %1$s artículo dentro de %2$s.', 'Quinnoa reúne actualmente %1$s artículos dentro de %2$s.', $archive_count, 'food' ) ),
							esc_html( number_format_i18n( $archive_count ) ),
							esc_html( $archive_name )
						);
					}
					?>
				</p>
				<?php if ( ! empty( $cross_links ) ) : ?>
					<p><?php echo esc_html( is_category()
						? ( $food_english ? 'The strongest editorial angles represented in this food family are:' : 'Los enfoques editoriales con más presencia en esta familia son:' )
						: ( $food_english ? 'The food families most represented in this topic are:' : 'Las familias de alimentos con más presencia en este tema son:' ) ); ?></p>
				<?php endif; ?>
			</div>
			<?php if ( ! empty( $cross_links ) ) : ?>
				<nav class="taxonomy-hub-context__links" aria-label="<?php echo esc_attr( $food_english ? 'Related Quinnoa sections' : 'Secciones relacionadas de Quinnoa' ); ?>">
					<?php foreach ( $cross_links as $cross_link ) : ?>
						<a href="<?php echo esc_url( $cross_link['url'] ); ?>">
							<strong><?php echo esc_html( $cross_link['label'] ); ?></strong>
							<span><?php
								printf(
									esc_html( $food_english ? _n( '%s article', '%s articles', $cross_link['count'], 'food' ) : _n( '%s artículo', '%s artículos', $cross_link['count'], 'food' ) ),
									esc_html( number_format_i18n( $cross_link['count'] ) )
								);
							?></span>
						</a>
					<?php endforeach; ?>
				</nav>
			<?php endif; ?>
		</section>
	<?php endif; ?>

	<?php if ( is_search() ) : ?>
		<div class="search-panel"><?php get_search_form(); ?></div>
	<?php endif; ?>

	<?php if ( $food_loop->have_posts() ) : ?>
		<div class="card-grid">
			<?php while ( $food_loop->have_posts() ) : $food_loop->the_post(); get_template_part( 'template-parts/card' ); endwhile; ?>
		</div>
		<?php
		$pagination = paginate_links(
			array(
				'current'   => $current_page,
				'total'     => max( 1, (int) $food_loop->max_num_pages ),
				'end_size'  => 2,
				'mid_size'  => 3,
				'prev_text' => $food_english ? '← Previous' : '← Anterior',
				'next_text' => $food_english ? 'Next →' : 'Siguiente →',
			)
		);
		if ( $pagination ) : ?><nav class="pagination nav-links" aria-label="<?php echo esc_attr( $food_english ? 'Article pagination' : 'Paginación de artículos' ); ?>"><?php echo wp_kses_post( $pagination ); ?></nav><?php endif; ?>
		<?php wp_reset_postdata(); ?>
	<?php else : ?>
		<div class="answer-box"><strong><?php echo esc_html( $food_english ? 'No articles found' : 'No hay artículos' ); ?></strong><p><?php echo esc_html( $food_english ? 'Try another search or browse a different section.' : 'Prueba con otra búsqueda o consulta otra sección.' ); ?></p></div>
		<div class="search-panel"><?php get_search_form(); ?></div>
	<?php endif; ?>
</div>

<?php get_footer(); ?>
