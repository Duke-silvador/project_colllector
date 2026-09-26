<?php $food_english = function_exists( 'food_is_english' ) && food_is_english(); ?>
<form role="search" method="get" class="search-form" action="<?php echo esc_url( function_exists( 'food_language_home_url' ) ? food_language_home_url() : home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="site-search"><?php echo esc_html( $food_english ? 'Search:' : 'Buscar:' ); ?></label>
	<input id="site-search" type="search" class="search-field" placeholder="<?php echo esc_attr( $food_english ? 'Search Quinnoa…' : 'Buscar en Quinnoa…' ); ?>" value="<?php echo esc_attr( get_search_query() ); ?>" name="s">
	<button type="submit" class="search-submit"><?php echo esc_html( $food_english ? 'Search' : 'Buscar' ); ?></button>
</form>
