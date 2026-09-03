<?php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
    ->in(__DIR__ . '/tests')
    ->in(__DIR__ . '/config')
    ->in(__DIR__ . '/bootstrap');

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        'no_extra_blank_lines' => ['tokens' => ['extra']],
        'no_whitespace_in_blank_line' => true,
        'single_blank_line_at_eof' => true,
        'no_trailing_whitespace' => true,
        'array_syntax' => ['syntax' => 'short'],
        'trim_array_spaces' => true,
        'no_whitespace_before_comma_in_array' => true,
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'no_unused_imports' => true,
        'single_quote' => true,
        'no_empty_statement' => true,
    ])
    ->setFinder($finder)
    ->setRiskyAllowed(false);
