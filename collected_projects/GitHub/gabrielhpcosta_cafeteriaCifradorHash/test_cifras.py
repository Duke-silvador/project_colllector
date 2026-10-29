import unittest

from cifras import cesar, processar, substituicao, transposicao


class TestCesar(unittest.TestCase):
    def test_cifrar(self):
        self.assertEqual(cesar("ABC xyz", 3), "DEF abc")

    def test_decifrar(self):
        self.assertEqual(cesar("DEF abc", 3, decifrar=True), "ABC xyz")


class TestSubstituicao(unittest.TestCase):
    def test_ida_e_volta(self):
        texto = "Encontro amanha as 10h!"
        cifrado = substituicao(texto, "UNIP")
        self.assertNotEqual(cifrado, texto)
        self.assertEqual(substituicao(cifrado, "UNIP", decifrar=True), texto)


class TestTransposicao(unittest.TestCase):
    def test_ida_e_volta(self):
        for texto in ["ATAQUE AO AMANHECER", "abc", "Senha: 1234, nao conte."]:
            cifrado = transposicao(texto, "CHAVE")
            self.assertEqual(sorted(cifrado), sorted(texto))
            self.assertEqual(transposicao(cifrado, "CHAVE", decifrar=True), texto)


class TestValidacao(unittest.TestCase):
    def test_mensagem_vazia(self):
        resultado, erro = processar("   ", "cesar", "3", "cifrar")
        self.assertIsNone(resultado)
        self.assertIsNotNone(erro)

    def test_caractere_invalido(self):
        _, erro = processar("oi @", "cesar", "3", "cifrar")
        self.assertIn("@", erro)

    def test_chave_cesar_fora_do_limite(self):
        _, erro = processar("oi", "cesar", "30", "cifrar")
        self.assertIsNotNone(erro)

    def test_chave_com_numero(self):
        _, erro = processar("oi", "substituicao", "abc1", "cifrar")
        self.assertIsNotNone(erro)

    def test_acentos_sao_removidos(self):
        resultado, erro = processar("ação", "cesar", "1", "cifrar")
        self.assertIsNone(erro)
        self.assertEqual(resultado, "bdbp")


if __name__ == "__main__":
    unittest.main()
