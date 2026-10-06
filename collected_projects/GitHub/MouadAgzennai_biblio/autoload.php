<?php
spl_autoload_register(function (string $classe) {
require_once __DIR__ . '/src/' . $classe . '.php';
});