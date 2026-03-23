"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function StoryPage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-bg-card">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-text-muted hover:text-text text-sm">← Retour</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🤧</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Comment tout a commencé
          </h1>
          <p className="text-text-muted text-sm">
            L&apos;histoire vraie d&apos;un homme, d&apos;un rhume, et d&apos;une révélation.
          </p>
        </div>

        <article className="space-y-6 text-text/90 leading-relaxed">
          <p className="text-lg">
            Un jour, j&apos;ai eu la grippe.
          </p>

          <p>
            Rien de dramatique — un petit rhume, le nez bouché, la voix un peu nasillarde.
            Mais moi, j&apos;étais devenu <em>accro</em> à la dictée vocale. Mes e-mails, mes notes,
            mes messages — tout passait par ma voix. Plus rapide que le clavier, plus naturel,
            plus fluide.
          </p>

          <p>
            Sauf que ce jour-là, mon fidèle compagnon numérique a décidé de me trahir.
          </p>

          <div className="p-5 rounded-2xl bg-error/5 border border-error/20 my-8">
            <p className="font-mono text-sm text-error/80 leading-loose">
              « Bodgour, ge vais bieb berci. Ze vous cobfirbe botre rebdez-vous de debain. »
            </p>
            <p className="text-xs text-text-muted mt-2 text-right">
              — Ce que mon micro a compris quand j&apos;ai dicté
              « Bonjour, je vais bien merci. Je vous confirme notre rendez-vous de demain. »
            </p>
          </div>

          <p>
            Du <strong>CHA-RA-BIA</strong>. Pas une phrase lisible. Pas un mot correct.
            J&apos;ai regardé mon écran, horrifié. Mon premier réflexe a été de chercher un coupable.
          </p>

          <div className="p-5 rounded-2xl bg-bg-card border border-border my-8">
            <p className="text-sm text-text-muted italic mb-3">
              « Il doit bien exister un modèle de reconnaissance vocale capable de comprendre
              une personne enrhumée, non ? Un modèle spécialisé ? Une IA plus intelligente ? »
            </p>
            <p className="text-sm text-text-muted">
              J&apos;ai cherché. Longtemps. Partout.
            </p>
          </div>

          <p>
            Et c&apos;est là que la révélation est tombée. Comme une enclume de dessin animé.
          </p>

          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 my-8 text-center">
            <p className="text-xl font-semibold text-primary">
              Le problème, ce n&apos;était pas le micro.
              <br />
              Le problème, ce n&apos;était pas l&apos;algorithme.
              <br />
              Le problème, c&apos;était <span className="text-2xl">moi</span>.
            </p>
          </div>

          <p>
            J&apos;ai réalisé que même en bonne santé, mes dictées étaient d&apos;un niveau
            extrêmement bas. Pas à cause de la pauvreté de mes outils — bien au contraire,
            la technologie est remarquable — mais à cause du <strong>locuteur aux commandes</strong>.
          </p>

          <p>
            Je marmonnais mes fins de phrases. J&apos;avalais des syllabes. Je disais « euh » toutes
            les trois secondes. Je ne dictais jamais la ponctuation. Et je blâmais le micro.
          </p>

          <p>
            Alors j&apos;ai créé <strong>Diction Coach</strong>.
          </p>

          <p>
            Pas un cours de diction ennuyeux. Pas un logiciel médical.
            Juste un terrain de jeu pour découvrir que la dictée vocale, quand on s&apos;y entraîne,
            c&apos;est <strong>3 à 5 fois plus rapide</strong> que le clavier. Et que les erreurs
            qu&apos;on reproche à la machine viennent presque toujours de nous.
          </p>

          <div className="p-5 rounded-2xl bg-accent/5 border border-accent/20 my-8 text-center">
            <p className="text-lg font-semibold text-accent mb-2">
              🎬 Le défi Antoine de Caunes
            </p>
            <p className="text-sm text-text-muted mb-3">
              Dans l&apos;émission Rapido, Antoine de Caunes récitait 90 mots en 30 secondes
              avec une diction parfaite. Essayez de le battre.
            </p>
            <Link
              href="/exercise/df-01-rapido-caunes"
              className="inline-block px-5 py-2 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-light transition-colors"
            >
              Relever le défi →
            </Link>
          </div>

          <p className="text-text-muted text-sm text-center mt-10">
            — Thomas, un soir de grippe, Nancy 🇫🇷
          </p>
        </article>
      </main>
    </div>
  );
}
