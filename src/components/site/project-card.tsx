import Link from "next/link";
import type { Project } from "@/lib/content";

/**
 * The three illustrative "mock window" art treatments from the original
 * design. Phase 4 replaces these with real cover images from the media
 * library; until then they keep the layout honest without fake screenshots.
 */
function ProjectArt({ art }: { art: Project["art"] }) {
  if (art === 1) {
    return (
      <div className="flex h-[210px] items-center justify-center overflow-hidden bg-linear-140 from-violet-950 to-violet-500 p-[22px] sm:h-[230px]">
        <div className="w-[90%] -rotate-2 rounded-xl bg-white p-[13px] shadow-[0_16px_35px_rgb(39_17_100/0.19)]">
          <div className="mb-[13px] h-2 w-[35%] rounded-[5px] bg-violet-200" />
          <div className="flex gap-2">
            <div className="h-[105px] flex-1 rounded-lg bg-violet-700" />
            <div className="h-[105px] flex-1 rounded-lg bg-violet-100" />
          </div>
          <div className="mt-2 flex gap-2">
            <div className="h-[26px] flex-1 rounded-lg bg-violet-100" />
            <div className="h-[26px] flex-1 rounded-lg bg-violet-700" />
          </div>
        </div>
      </div>
    );
  }

  if (art === 2) {
    return (
      <div className="flex h-[210px] items-center justify-center overflow-hidden bg-linear-135 from-[#e8e3ff] to-violet-300 p-[22px] sm:h-[230px]">
        <div className="w-[90%] -rotate-2 rounded-xl bg-white p-[13px] shadow-[0_16px_35px_rgb(39_17_100/0.19)]">
          <div className="mb-[13px] h-2 w-[35%] rounded-[5px] bg-violet-200" />
          <div className="flex h-20 items-end gap-[5px] p-2">
            <i className="block h-[30%] w-[15%] rounded-t bg-violet-500" />
            <i className="block h-[45%] w-[15%] rounded-t bg-violet-500" />
            <i className="block h-[65%] w-[15%] rounded-t bg-violet-500" />
            <i className="block h-[82%] w-[15%] rounded-t bg-violet-500" />
            <i className="block h-full w-[15%] rounded-t bg-violet-500" />
          </div>
          <div className="flex gap-2">
            <div className="h-[22px] flex-1 rounded-lg bg-violet-100" />
            <div className="h-[22px] flex-1 rounded-lg bg-violet-700" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[210px] items-center justify-center overflow-hidden bg-linear-135 from-violet-50 to-[#d4ccff] p-[22px] sm:h-[230px]">
      <div className="w-[90%] rotate-2 rounded-xl bg-white p-[13px] shadow-[0_16px_35px_rgb(39_17_100/0.19)]">
        <div className="mb-[13px] h-2 w-[35%] rounded-[5px] bg-violet-200" />
        <div className="flex gap-2">
          <div className="h-[105px] flex-1 rounded-lg bg-violet-100" />
          <div className="h-[105px] flex-1 rounded-lg bg-violet-700" />
        </div>
        <div className="mt-2 flex gap-2">
          <div className="h-[25px] flex-1 rounded-lg bg-violet-700" />
          <div className="h-[25px] flex-1 rounded-lg bg-violet-100" />
        </div>
      </div>
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative overflow-hidden rounded-[23px] border border-line transition duration-200 ease-out focus-within:border-violet-300 hover:-translate-y-1 hover:shadow-soft">
      <ProjectArt art={project.art} />
      <div className="p-[22px]">
        <h3 className="mb-2 text-[20px] leading-[1.25] tracking-[-0.03em]">
          <Link
            href={`/portfolio/${project.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {project.title}
          </Link>
        </h3>
        <p className="mb-4 text-[15px] leading-[1.75] text-muted">
          {project.summary}
        </p>
        <ul className="flex flex-wrap gap-[7px]">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-violet-50 px-[9px] py-1.5 text-xs font-bold text-violet-800"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
