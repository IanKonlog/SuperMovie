import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPersonPage } from "@/modules/tmdb/queries";
import { PersonCredits } from "./person-credits";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const personId = Number((await params).id);
  const person = Number.isInteger(personId)
    ? await getPersonPage(personId).catch(() => null)
    : null;
  return person ? { title: `${person.name} — SuperMovie` } : {};
}

function age(birthday: string, deathday: string | null): number | null {
  const end = deathday ?? new Date().toISOString().slice(0, 10);
  const years = Number(end.slice(0, 4)) - Number(birthday.slice(0, 4));
  return Number.isFinite(years) && years > 0 ? years : null;
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const personId = Number((await params).id);
  if (!Number.isInteger(personId) || personId < 1 || personId > 100_000_000) {
    notFound();
  }

  const person = await getPersonPage(personId).catch(() => null);
  if (!person) notFound();

  const facts: [string, string][] = [];
  if (person.knownFor) facts.push(["Known for", person.knownFor]);
  if (person.birthday) {
    const years = age(person.birthday, person.deathday);
    facts.push([
      person.deathday ? "Lived" : "Born",
      person.deathday
        ? `${person.birthday} — ${person.deathday}`
        : person.birthday + (years ? ` (age ${years})` : ""),
    ]);
  }
  if (person.placeOfBirth) facts.push(["From", person.placeOfBirth]);
  facts.push(["Credits", String(person.credits.length)]);

  return (
    <div className="page-enter flex flex-col gap-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="w-40 shrink-0 sm:w-48">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface-2">
            {person.profileUrl ? (
              <Image
                src={person.profileUrl}
                alt={`Photo of ${person.name}`}
                width={192}
                height={288}
                className="h-auto w-full"
                unoptimized
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center text-4xl text-muted">
                {person.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{person.name}</h1>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {person.biography && (
            <details className="mt-1 text-sm text-foreground/80">
              <summary className="cursor-pointer text-xs font-medium text-muted transition hover:text-foreground">
                Biography
              </summary>
              <p className="mt-2 leading-relaxed">{person.biography}</p>
            </details>
          )}
        </div>
      </div>

      <section aria-label="Credits" className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">
          Acted in{" "}
          <span className="text-sm font-normal text-muted">
            ({person.credits.length})
          </span>
        </h2>
        {person.credits.length === 0 ? (
          <p className="text-sm text-muted">No credited appearances found.</p>
        ) : (
          <PersonCredits credits={person.credits} />
        )}
      </section>
    </div>
  );
}
