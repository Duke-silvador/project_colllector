from blog.menu import mostrar_menu

from blog.modelos import (
    Blog,
    Autor,
    Post
)

from blog.datos import (
    cargar_posts,
    guardar_posts
)

from blog.operaciones import (
    listar_posts,
    buscar_por_titulo,
    filtrar_por_tag
)

from blog.validaciones import (
    validar_post
)


if __name__ == "__main__":

    posts = cargar_posts()

    blog = Blog(posts)

    while True:

        opcion = mostrar_menu()

        # =================================
        # Ver posts
        # =================================

        if opcion == 1:

            listar_posts(
                blog.obtener_posts()
            )

        # =================================
        # Buscar por título
        # =================================

        elif opcion == 2:

            termino = input(
                "Ingrese un término: "
            ).strip()

            if not termino:

                print(
                    "La búsqueda no puede estar vacía."
                )

                continue

            resultados = buscar_por_titulo(
                blog.obtener_posts(),
                termino
            )

            if resultados:

                for post in resultados:

                    print(
                        f"- {post.titulo}"
                    )

            else:

                print(
                    "No se encontraron resultados."
                )

        # =================================
        # Filtrar por tag
        # =================================

        elif opcion == 3:

            tag = input(
                "Ingrese un tag: "
            ).strip()

            if not tag:

                print(
                    "El tag no puede estar vacío."
                )

                continue

            resultados = filtrar_por_tag(
                blog.obtener_posts(),
                tag
            )

            if resultados:

                for post in resultados:

                    print(
                        f"- {post.titulo}"
                    )

            else:

                print(
                    "No se encontraron posts."
                )

        # =================================
        # Crear post
        # =================================

        elif opcion == 4:

            print(
                "\nCREAR NUEVO POST"
            )

            titulo = input(
                "Título: "
            )

            contenido = input(
                "Contenido: "
            )

            nombre = input(
                "Nombre autor: "
            )

            biografia = input(
                "Biografía: "
            )

            especialidad = input(
                "Especialidad: "
            )

            email = input(
                "Email: "
            )

            tags = input(
                "Tags separados por coma: "
            ).split(",")

            estado = input(
                "Estado (borrador/publicado/archivado): "
            )

            autor = Autor(
                nombre,
                biografia,
                especialidad,
                email,
                []
            )

            nuevo_id = len(
                blog.obtener_posts()
            ) + 1

            nuevo_post = Post(
                nuevo_id,
                titulo,
                contenido,
                autor,
                [t.strip() for t in tags],
                estado
            )

            blog.agregar_post(
                nuevo_post
            )

            print(
                "Post agregado correctamente."
            )

        # =================================
        # Validar posts
        # =================================

        elif opcion == 5:

            print(
                "\nVALIDACIÓN DE POSTS"
            )

            for post in blog.obtener_posts():

                valido, mensaje = validar_post(
                    post
                )

                print(
                    f"Post {post.id}: {mensaje}"
                )

        # =================================
        # Guardar JSON
        # =================================

        elif opcion == 6:

            guardar_posts(
                blog.obtener_posts()
            )

            print(
                "Posts guardados correctamente."
            )

        # =================================
        # Salir
        # =================================

        elif opcion == 7:

            guardar_posts(
                blog.obtener_posts()
            )

            print(
                "Gracias por utilizar el sistema."
            )

            break