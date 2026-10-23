<?php
// config.php: guarda as informações necessárias para acessar o banco de dados em constantes (espaço onde é guardado um valor identificado por nome, mas o valor não pode ser alterado depois de definida), para que outros arquivos, connect.php, possam utilizá-las.

define('DB_HOST', 'localhost'); // Endereço IP do servidor PostgreSQL
define('DB_PORT', '5432'); // Porta padrão do PostgreSQL
define('DB_NAME', 'travely'); // Nome do banco de dados
define('DB_USER', 'travely'); // Nome de usuário do banco de dados
define('DB_PASS', '12345'); // Senha do banco de dados
?>