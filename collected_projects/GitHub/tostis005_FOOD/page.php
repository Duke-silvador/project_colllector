<?php get_header(); ?>

<?php while ( have_posts() ) : the_post(); ?>
	<div class="article-shell">
		<?php function_exists( 'food_language_breadcrumbs' ) ? food_language_breadcrumbs() : food_breadcrumbs(); ?>
		<header class="article-header">
			<h1><?php the_title(); ?></h1>
			<?php if ( has_excerpt() ) : ?><p class="article-deck"><?php echo esc_html( get_the_excerpt() ); ?></p><?php endif; ?>
		</header>
		<article <?php post_class(); ?>>
			<div class="entry-content"><?php the_content(); ?></div>
		</article>
	</div>
<?php endwhile; ?>

<?php get_footer(); ?>