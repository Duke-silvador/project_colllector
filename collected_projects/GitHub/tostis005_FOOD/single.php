<?php
$food_article_layout_css = get_template_directory() . '/assets/css/article-layout-v2.css';
if ( file_exists( $food_article_layout_css ) ) {
	wp_enqueue_style(
		'food-article-layout-v2',
		get_template_directory_uri() . '/assets/css/article-layout-v2.css',
		array( 'food-style' ),
		(string) filemtime( $food_article_layout_css )
	);
}
get_header();
?>

<?php while ( have_posts() ) : the_post(); ?>
	<?php
	$food_english  = function_exists( 'food_is_english' ) && food_is_english();
	$food_category = function_exists( 'food_get_primary_food_category' ) ? food_get_primary_food_category() : null;
	$food_topics   = function_exists( 'food_get_article_topics' ) ? food_get_article_topics() : array();
	$food_visual   = function_exists( 'food_get_post_visual_context' ) ? food_get_post_visual_context() : null;
	$food_content  = apply_filters( 'the_content', get_the_content() );
	$food_sources  = json_decode( (string) get_post_meta( get_the_ID(), '_food_sources', true ), true );
	$food_source_count = is_array( $food_sources )
		? count(
			array_filter(
				$food_sources,
				function( $source ) {
					return is_array( $source ) && ! empty( $source['name'] ) && ! empty( $source['url'] );
				}
			)
		)
		: 0;
	$food_published_ts = (int) get_post_time( 'U', true, get_the_ID() );
	$food_modified_ts  = (int) get_post_modified_time( 'U', true, get_the_ID() );
	$food_show_updated = $food_modified_ts > ( $food_published_ts + DAY_IN_SECONDS );
	$food_date_ts      = $food_show_updated ? $food_modified_ts : $food_published_ts;
	$food_date_iso     = $food_show_updated ? get_the_modified_date( DATE_W3C ) : get_the_date( DATE_W3C );
	$food_date_display = $food_english ? gmdate( 'M j, Y', $food_date_ts ) : gmdate( 'd/m/Y', $food_date_ts );

	// Older imported articles may contain a prose Sources/Fuentes block inside
	// content_html as well as the structured source list appended by the importer.
	// When the structured list is present, suppress only the earlier prose block.
	if ( false !== strpos( $food_content, 'food-article-sources' ) ) {
		$food_content = preg_replace(
			'#<h2>\s*(?:Fuentes|Sources)\s*</h2>\s*<p>.*?</p>(?=.*?<ul[^>]*class=["\'][^"\']*food-article-sources[^"\']*["\'])#is',
			'',
			$food_content,
			1
		);
	}

	if ( $food_source_count > 0 ) {
		$food_content = preg_replace(
			'#<h2>\s*(Fuentes|Sources)\s*</h2>#iu',
			'<h2 id="article-sources">$1</h2>',
			$food_content,
			1
		);
	}

	/*
	 * Keep advertising proportional to the amount of editorial material.
	 * Most Quinnoa guides are deliberately concise, so short pages should not
	 * carry the same ad load as a substantially longer reference article.
	 */
	$food_plain_content = trim( wp_strip_all_tags( html_entity_decode( $food_content, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) );
	$food_word_matches  = array();
	$food_word_count    = preg_match_all( "/[\\p{L}\\p{N}]+(?:['’\\-][\\p{L}\\p{N}]+)*/u", $food_plain_content, $food_word_matches );
	$food_word_count    = false === $food_word_count ? 0 : (int) $food_word_count;
	$food_ad_medium     = $food_word_count >= 850;
	$food_ad_long       = $food_word_count >= 1100;
	$food_ad_extra_long = $food_word_count >= 1400;

	if ( function_exists( 'food_internal_links_inject' ) ) {
		$food_content = food_internal_links_inject( $food_content, get_the_ID() );
	}
	$food_native_in_content = false;
	$food_h2_count = preg_match_all( '#<h2\\b#i', $food_content );

	// Two placements are enough for a standard 4-minute guide.
	if ( function_exists( 'food_adsterra_inject_rectangle_after_second_heading' ) ) {
		$food_content = food_adsterra_inject_rectangle_after_second_heading( $food_content );
	}

	// Add a native placement only when the article has enough editorial depth.
	if ( $food_ad_medium && function_exists( 'food_adsterra_inject_native_after_fifth_heading' ) && $food_h2_count >= 5 ) {
		$food_content = food_adsterra_inject_native_after_fifth_heading( $food_content );
		$food_native_in_content = true;
	}

	// Reserve the extra in-content unit for genuinely long future guides.
	if ( $food_ad_extra_long && function_exists( 'food_adsterra_inject_tall_rectangle_after_seventh_heading' ) && $food_h2_count >= 7 ) {
		$food_content = food_adsterra_inject_tall_rectangle_after_seventh_heading( $food_content );
	}
	?>
	<div class="article-shell"><?php function_exists( 'food_language_breadcrumbs' ) ? food_language_breadcrumbs() : food_breadcrumbs(); ?></div>

	<header class="article-header article-shell">
		<div class="article-dimensions">
			<?php if ( $food_category ) : ?>
				<a href="<?php echo esc_url( get_category_link( $food_category ) ); ?>"><?php echo esc_html( function_exists( 'food_family_display' ) ? food_family_display( $food_category->slug ) : $food_category->name ); ?></a>
			<?php endif; ?>
			<?php foreach ( $food_topics as $food_topic ) : ?>
				<a class="is-topic" href="<?php echo esc_url( get_term_link( $food_topic ) ); ?>"><?php echo esc_html( function_exists( 'food_topic_display' ) ? food_topic_display( $food_topic ) : $food_topic->name ); ?></a>
			<?php endforeach; ?>
		</div>
		<h1><?php the_title(); ?></h1>
		<div class="article-meta">
			<span><?php echo esc_html( function_exists( 'food_localized_reading_time' ) ? food_localized_reading_time() : food_reading_time() ); ?></span>
			<span aria-hidden="true">·</span>
			<span class="article-byline"><?php echo esc_html( $food_english ? 'By the Quinnoa editorial team' : 'Por el equipo editorial de Quinnoa' ); ?></span>
			<span aria-hidden="true">·</span>
			<time datetime="<?php echo esc_attr( $food_date_iso ); ?>"><?php echo esc_html( ( $food_show_updated ? ( $food_english ? 'Updated ' : 'Actualizado ' ) : ( $food_english ? 'Published ' : 'Publicado ' ) ) . $food_date_display ); ?></time>
			<?php if ( $food_source_count > 0 ) : ?>
				<span aria-hidden="true">·</span>
				<a class="article-sources-link" href="#article-sources"><?php
					printf(
						esc_html( $food_english ? _n( '%s source', '%s sources', $food_source_count, 'food' ) : _n( '%s fuente', '%s fuentes', $food_source_count, 'food' ) ),
						esc_html( number_format_i18n( $food_source_count ) )
					);
				?></a>
			<?php endif; ?>
			<a class="article-methodology-link" href="<?php echo esc_url( function_exists( 'food_editorial_page_url' ) ? food_editorial_page_url( 'methodology', $food_english ? 'en' : 'es' ) : home_url( $food_english ? '/en/editorial-methodology/' : '/metodologia-editorial/' ) ); ?>"><?php echo esc_html( $food_english ? 'How we work' : 'Cómo trabajamos' ); ?></a>
		</div>
	</header>

	<?php if ( has_post_thumbnail() ) : ?>
		<figure class="article-hero"><?php the_post_thumbnail( 'food-hero' ); ?></figure>
	<?php elseif ( $food_visual ) : ?>
		<div class="article-hero-fallback <?php echo esc_attr( $food_visual['class'] ); ?>" aria-hidden="true">
			<span class="article-hero-art"></span>
			<?php echo $food_visual['svg']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
		</div>
	<?php endif; ?>

	<article <?php post_class( 'article-shell' ); ?>>
		<?php if ( has_excerpt() ) : ?><div class="answer-box"><strong><?php echo esc_html( $food_english ? 'Quick answer' : 'Respuesta rápida' ); ?></strong><p><?php echo esc_html( wp_strip_all_tags( get_the_excerpt() ) ); ?></p></div><?php endif; ?>
		<?php if ( function_exists( 'food_adsterra_render_responsive_banner' ) ) { food_adsterra_render_responsive_banner( 'article' ); } ?>
		<div class="article-body-layout">
			<div class="entry-content"><?php echo $food_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></div>
			<?php if ( $food_ad_extra_long && function_exists( 'food_adsterra_render_skyscraper' ) ) { food_adsterra_render_skyscraper(); } ?>
		</div>
		<div class="article-share">
			<button
				class="article-share-button"
				type="button"
				data-share-url="<?php echo esc_url( get_permalink() ); ?>"
				data-share-title="<?php echo esc_attr( get_the_title() ); ?>"
				data-share-label="<?php echo esc_attr( $food_english ? 'Share article' : 'Compartir artículo' ); ?>"
				data-copy-label="<?php echo esc_attr( $food_english ? 'Link copied' : 'Enlace copiado' ); ?>"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"></path></svg>
				<span class="article-share-label"><?php echo esc_html( $food_english ? 'Share article' : 'Compartir artículo' ); ?></span>
			</button>
			<span class="article-share-status screen-reader-text" aria-live="polite"></span>
		</div>
	</article>

	<?php if ( $food_ad_medium && ! $food_native_in_content && function_exists( 'food_adsterra_render_native_banner' ) ) : ?>
		<div class="article-shell"><?php food_adsterra_render_native_banner( 'article-end' ); ?></div>
	<?php endif; ?>

	<?php if ( $food_ad_long && function_exists( 'food_adsterra_render_article_footer_banner' ) ) : ?>
		<div class="article-shell article-footer-ad"><?php food_adsterra_render_article_footer_banner(); ?></div>
	<?php endif; ?>

	<?php
	$related_args = array(
		'post_type'           => 'post',
		'posts_per_page'      => 3,
		'post__not_in'        => array_values( array_unique( array_merge( array( get_the_ID() ), function_exists( 'food_internal_link_target_post_ids' ) ? food_internal_link_target_post_ids( get_the_ID() ) : array() ) ) ),
		'ignore_sticky_posts' => true,
	);
	$related_tax_query = array( 'relation' => 'OR' );
	if ( $food_category ) {
		$related_tax_query[] = array( 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => array( $food_category->term_id ) );
	}
	if ( ! empty( $food_topics ) ) {
		$related_tax_query[] = array( 'taxonomy' => 'food_topic', 'field' => 'term_id', 'terms' => array_map( function( $term ) { return (int) $term->term_id; }, $food_topics ) );
	}
	if ( count( $related_tax_query ) > 1 ) {
		$related_args['tax_query'] = $related_tax_query;
	}

	$related = new WP_Query( $related_args );
	if ( $related->have_posts() ) : ?>
		<section class="related">
			<div class="container">
				<div class="section-head"><div><div class="eyebrow"><?php echo esc_html( $food_english ? 'Keep exploring' : 'Sigue explorando' ); ?></div><h2><?php echo esc_html( $food_english ? 'Related articles' : 'Artículos relacionados' ); ?></h2></div></div>
				<div class="card-grid"><?php while ( $related->have_posts() ) : $related->the_post(); get_template_part( 'template-parts/card' ); endwhile; wp_reset_postdata(); ?></div>
			</div>
		</section>
	<?php endif; ?>
<?php endwhile; ?>

<?php get_footer(); ?>