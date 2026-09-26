<?php
/**
 * Main fallback template.
 *
 * @package FOOD
 */

$request_path = wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH );
if ( '/ads.txt' === $request_path ) {
	$ads_file = get_template_directory() . '/ads.txt';

	if ( is_readable( $ads_file ) ) {
		status_header( 200 );
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'X-Content-Type-Options: nosniff' );
		echo file_get_contents( $ads_file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		exit;
	}
}

require get_template_directory() . '/archive.php';
