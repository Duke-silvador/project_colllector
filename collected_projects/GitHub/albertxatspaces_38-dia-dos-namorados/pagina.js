const tema = TEMAS[window.VERSAO];
if (!tema) throw new Error("Versão desconhecida: " + window.VERSAO);
document.title = "xatspaces · " + tema.titulo;
document.body.style.setProperty("--fundo", tema.pagina);
document.querySelector(".cena").innerHTML = montaCena(tema);

const selo = document.createElement("a");
selo.className = "xs-marca";
selo.href = "https://xatspaces.com/";
selo.target = "_blank";
selo.rel = "noopener";
selo.title = selo.ariaLabel = "Quero um xatspace assim";
selo.style.cssText = "--xs-marca-fundo:" + tema.selo.fundo + ";--xs-marca-cor:" + tema.selo.cor + ";--xs-marca-destaque:" + tema.selo.destaque;
selo.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z"/><path d="M19 15.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z" opacity=".6"/></svg><span class="xs-marca__t">Quero um xatspace assim</span>';
document.body.appendChild(selo);
