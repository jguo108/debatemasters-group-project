import type { AgeBand } from "@/lib/data/types";

/** Matches `mockTopics[].id` — six solo debate areas. */
export const SOLO_TOPIC_AREA_IDS = [
  "class-forge",
  "home-base",
  "arcade-arena",
  "biomes-beasts",
  "redstone-lab",
  "village-hall",
] as const;

export type SoloTopicAreaId = (typeof SOLO_TOPIC_AREA_IDS)[number];

const TEN = 10 as const;

type PoolByAge = Record<AgeBand, readonly string[] & { length: typeof TEN }>;

function pool(by: PoolByAge): PoolByAge {
  return by;
}

/** Ten debate prompts per age band, per area (solo topic picker). */
export const SOLO_TOPIC_POOLS: Record<SoloTopicAreaId, PoolByAge> = {
  "class-forge": pool({
    under10: [
      "Should recess be longer every day?",
      "Is homework helpful or too tiring?",
      "Should you pick your own desk buddy?",
      "Are spelling tests a fair way to learn?",
      "Should lunch break be longer than it is now?",
      "Is art class as important as math class?",
      "Should phones stay in backpacks all day at school?",
      "Should every Friday be a free-reading day?",
      "Is team work better than working alone for projects?",
      "Should schools have a pajama spirit day once a month?",
    ],
    "10-14": [
      "Should school start later for middle school students?",
      "Should grades be replaced with progress badges and comments?",
      "Should AI writing tools be allowed when drafting essays?",
      "Is a strict phone ban at school more helpful than harmful?",
      "Should community service hours be required to graduate?",
      "Should exam weeks be replaced with project-only assessments?",
      "Is year-round school with shorter breaks better for learning?",
      "Should civics and media literacy be required every year?",
      "Should students choose a career pathway earlier?",
      "Should sports participation count toward academic credit?",
    ],
    "15-18": [
      "Should standardized tests still decide college readiness?",
      "Should weighted GPAs reward harder courses fairly for everyone?",
      "Should schools teach prompt engineering as a core literacy?",
      "Is block scheduling better than traditional periods?",
      "Should student government have a real budget for campus projects?",
      "Should open-note exams replace closed-book finals?",
      "Should late work policies be more flexible for mental health?",
      "Should schools ban laptops in lecture-style classes?",
      "Should internships replace part of senior-year coursework?",
      "Should class rank be published or kept private?",
    ],
    "18+": [
      "Should universities be mostly online within the next decade?",
      "Should tuition be tied to graduate employment outcomes?",
      "Should gap years be normalized before higher education?",
      "Should lecture capture replace mandatory physical attendance?",
      "Should AI detectors be used on all submitted coursework?",
      "Should general education requirements shrink for STEM majors?",
      "Should student loans be dischargeable in bankruptcy?",
      "Should research funding favor applied or basic science?",
      "Should academic hiring weight teaching more than research?",
      "Should micro-credentials replace traditional degrees for some fields?",
    ],
  }),
  "home-base": pool({
    under10: [
      "Should you get pocket money for every small chore?",
      "Is a later bedtime okay on weekends only?",
      "Should you save money or spend a little on treats?",
      "Should kids help pick the next family trip?",
      "Is screen time better before or after homework?",
      "Should siblings always share a bedroom?",
      "Are short family meetings a good idea each week?",
      "Should pets be allowed on the couch?",
      "Is cooking dinner once a week fair for kids?",
      "Should birthday parties be big or small?",
    ],
    "10-14": [
      "Should allowance be earned only, never automatic?",
      "Should teens have a say in family rules and curfew?",
      "Should parents monitor social accounts for safety?",
      "Is it fair to limit gaming on school nights only?",
      "Should kids be required to call grandparents weekly?",
      "Should chores rotate weekly so nobody is stuck?",
      "Should privacy include a locked diary or phone passcode?",
      "Should family dinner be phone-free for everyone?",
      "Should pets be a child's full responsibility or shared?",
      "Should holiday gifts focus on experiences over stuff?",
    ],
    "15-18": [
      "Should part-time jobs be encouraged during high school?",
      "Should parents track location apps for safety after 16?",
      "Should rent be charged symbolically once a teen works?",
      "Should curfew differ on weekends versus school nights?",
      "Should family vote on major purchases like a car or trip?",
      "Should parents co-sign first loans or refuse on principle?",
      "Should chores count toward car insurance or gas money?",
      "Should adult children pay board if living at home?",
      "Should family therapy be normalized for small conflicts?",
      "Should inheritance expectations be discussed early?",
    ],
    "18+": [
      "Should multigenerational homes be subsidized by policy?",
      "Should parental leave be equal for all caregivers?",
      "Should remote work change how families split chores?",
      "Should elders live with adult children by default?",
      "Should household labor be tracked and compensated?",
      "Should couples keep fully separate finances?",
      "Should prenups be standard for all marriages?",
      "Should adult children owe financial support to parents?",
      "Should holidays rotate between families fairly?",
      "Should pet custody be formalized in breakups?",
    ],
  }),
  "arcade-arena": pool({
    under10: [
      "Should there be a daily time limit on video games?",
      "Are board games better than video games for family night?",
      "Should kids design their own game levels in class?",
      "Is practice mode cheating or just learning?",
      "Should you finish homework before any games?",
      "Is single-player calmer than multiplayer?",
      "Should loud game sounds be turned down at night?",
      "Should parents play games with you sometimes?",
      "Are puzzle games better than racing games for brains?",
      "Should game time be a reward for good behavior?",
    ],
    "10-14": [
      "Should esports count as real sports in schools?",
      "Should loot boxes be banned in games for kids?",
      "Should schools host Minecraft clubs for creativity?",
      "Is speedrunning a game a waste of time or a skill?",
      "Should violent games be banned under a certain age?",
      "Should game chat be off by default for young players?",
      "Should streaming be a career path taught in schools?",
      "Should microtransactions be capped per month?",
      "Should gym class include rhythm and dance games?",
      "Should modding games be taught as beginner coding?",
    ],
    "15-18": [
      "Should collegiate esports offer scholarships like athletics?",
      "Should game addiction be treated like other addictions?",
      "Should competitive gaming have drug testing like sports?",
      "Should narrative games count as literature in English class?",
      "Should VR headsets be allowed in school libraries?",
      "Should game studios unionize more widely?",
      "Should AI-generated assets be banned in indie games?",
      "Should crunch culture in studios be legally limited?",
      "Should games tackle political themes without censorship?",
      "Should emulation of old games be legal for preservation?",
    ],
    "18+": [
      "Should game preservation laws require source code escrow?",
      "Should streamers be liable for chat harassment?",
      "Should UGC platforms pay royalties to mod authors?",
      "Should competitive integrity ban all performance drugs?",
      "Should games disclose odds for every random reward?",
      "Should AAA titles ship unfinished with roadmaps?",
      "Should cloud-only games require offline fallback?",
      "Should gaming disorder diagnoses change insurance coverage?",
      "Should esports visas be easier for international players?",
      "Should AI NPCs replace human voice actors entirely?",
    ],
  }),
  "biomes-beasts": pool({
    under10: [
      "Are cats or dogs easier pets for kids?",
      "Should every classroom have a class pet?",
      "Should zoos still exist or should animals live wild?",
      "Is feeding ducks at the pond a good idea?",
      "Should plastic straws be banned to help ocean animals?",
      "Are bees more important than butterflies for nature?",
      "Should families adopt rescue pets only?",
      "Is a fox in the yard exciting or scary?",
      "Should you recycle every plastic bottle you use?",
      "Are dinosaurs still the coolest animals ever?",
    ],
    "10-14": [
      "Should exotic pets be banned in cities?",
      "Should fishing catch-and-release be required everywhere?",
      "Should national parks limit visitors to protect wildlife?",
      "Should plant-based school lunches be the default?",
      "Should wolf reintroduction be expanded or rolled back?",
      "Should marine parks keep large whales in captivity?",
      "Should hunting fund conservation more than tourism?",
      "Should invasive species removal use poison or traps?",
      "Should kids be vegan by family choice without pushback?",
      "Should backyard chickens be allowed in every suburb?",
    ],
    "15-18": [
      "Should carbon taxes fund rewilding projects?",
      "Should factory farming be phased out on a deadline?",
      "Should gene drives be used to eradicate malaria mosquitoes?",
      "Should national borders block wildlife corridors?",
      "Should deep-sea mining be banned for biodiversity?",
      "Should trophy hunting bans apply worldwide?",
      "Should lab-grown meat replace feedlot beef first?",
      "Should endangered species trade be decriminalized for ranching?",
      "Should national parks allow more logging for fire control?",
      "Should zoos focus only on rehabilitation and release?",
    ],
    "18+": [
      "Should personhood rights extend to great apes?",
      "Should carbon markets include biodiversity credits?",
      "Should whaling resume under strict scientific quotas?",
      "Should national sovereignty limit UNESCO natural sites?",
      "Should synthetic biology patents cover living organisms?",
      "Should animal testing be banned for all cosmetics?",
      "Should wild horses be culled to protect rangelands?",
      "Should insect farming replace poultry protein?",
      "Should ecocide be prosecuted at the International Criminal Court?",
      "Should rewilding predators take priority over livestock?",
    ],
  }),
  "redstone-lab": pool({
    under10: [
      "Should robots help kids clean their rooms?",
      "Is talking to Alexa or Siri safe for little kids?",
      "Should kids learn simple coding in first grade?",
      "Are learning apps on tablets good for reading practice?",
      "Should parents sometimes read your messages to keep you safe?",
      "Should cartoons on a phone be okay right before bed?",
      "Should schools use robots to serve lunch someday?",
      "Can a robot draw your art homework for you?",
      "Should families have one tech-free hour every evening?",
      "Are smartwatches for kids a good idea?",
    ],
    "10-14": [
      "Should schools teach how large language models work?",
      "Should AI tutors replace homework help from parents?",
      "Should facial recognition be used in school hallways?",
      "Should students cite AI tools like any other source?",
      "Should deepfakes be illegal to make of classmates?",
      "Should phone keyboards predict text for you in essays?",
      "Should kids under 13 have social media at all?",
      "Should STEM fairs require an ethics board for projects?",
      "Should classroom cameras livestream for parents?",
      "Should robots grade short-answer tests fairly?",
    ],
    "15-18": [
      "Should universities ban undisclosed AI on admissions essays?",
      "Should copyright cover AI-generated art and music?",
      "Should autonomous weapons be banned by treaty?",
      "Should biometric passports be optional for privacy?",
      "Should open-source models be regulated like exports?",
      "Should AI companions replace human therapists for teens?",
      "Should gig platforms be liable for algorithmic bias?",
      "Should data labor unions negotiate for training data?",
      "Should encryption backdoors be mandated for crime cases?",
      "Should national AI safety labs be publicly funded?",
    ],
    "18+": [
      "Should AGI development pause until safety proofs exist?",
      "Should algorithmic pricing be antitrust per se?",
      "Should AI-generated political ads be banned?",
      "Should model weights be treated as munitions?",
      "Should universal basic income follow mass automation?",
      "Should personal data be a salable asset by default?",
      "Should AI watermarking be mandatory for public media?",
      "Should courts admit AI-generated evidence with juries?",
      "Should public sector AI be open weights only?",
      "Should lethal autonomy require a human in the loop forever?",
    ],
  }),
  "village-hall": pool({
    under10: [
      "Should kids help pick a charity to support each month?",
      "Is waving to neighbors on the street important?",
      "Should you always thank the bus driver when you leave?",
      "Should shy new kids get a buddy at lunch?",
      "Should parks have more trash cans so litter stops?",
      "Is a lemonade stand a good first business?",
      "Should classes pick a kindness goal every week?",
      "Should old toys be donated every season?",
      "Is sharing your snack with a friend always the nice move?",
      "Should kids help vote on simple classroom rules?",
    ],
    "10-14": [
      "Should student councils have a real budget for projects?",
      "Should volunteering be required for middle school promotion?",
      "Should curfews for teens be set by city or by parents?",
      "Should bike lanes replace parking on main streets?",
      "Should public libraries stay open later on weekends?",
      "Should littering fines be much higher in parks?",
      "Should schools host monthly neighborhood cleanups?",
      "Should food trucks be allowed near schools at lunch?",
      "Should youth speak at city council on big issues?",
      "Should crosswalk timers be longer for kids and elders?",
    ],
    "15-18": [
      "Should the voting age be lowered to sixteen nationwide?",
      "Should jury duty include high school seniors as observers?",
      "Should protest permits be easier for student marches?",
      "Should civic tech apps replace paper ballots first?",
      "Should mandatory national service include non-military options?",
      "Should HOAs ban political yard signs entirely?",
      "Should cash bail be abolished for nonviolent offenses?",
      "Should ranked-choice voting replace plurality in local races?",
      "Should campaign finance caps apply to school board races?",
      "Should sanctuary policies protect undocumented students?",
    ],
    "18+": [
      "Should compulsory voting be adopted in democracies?",
      "Should public referenda bypass representative bodies?",
      "Should social media be regulated as public utilities?",
      "Should UBI replace most welfare programs?",
      "Should term limits apply to supreme courts?",
      "Should gerrymandering be solved by independent commissions?",
      "Should foreign election interference trigger automatic reruns?",
      "Should localism devolve federal power on housing?",
      "Should wealth taxes fund universal childcare?",
      "Should civic lotteries replace some elected offices?",
    ],
  }),
};

function assertPoolLengths(): void {
  for (const area of SOLO_TOPIC_AREA_IDS) {
    for (const band of ["under10", "10-14", "15-18", "18+"] as const) {
      const list = SOLO_TOPIC_POOLS[area][band];
      if (list.length !== TEN) {
        throw new Error(`solo topic pool length: ${area} ${band} has ${list.length}, expected ${TEN}`);
      }
    }
  }
}

assertPoolLengths();

export function isSoloTopicAreaId(id: string): id is SoloTopicAreaId {
  return (SOLO_TOPIC_AREA_IDS as readonly string[]).includes(id);
}

export function getSoloTopicPool(areaId: SoloTopicAreaId, ageBand: AgeBand): readonly string[] {
  return SOLO_TOPIC_POOLS[areaId][ageBand];
}

/** Stable default line for SSR / legacy `?topic=areaId` (10–14 band, first prompt). */
export function defaultTopicLineForArea(areaId: SoloTopicAreaId): string {
  return SOLO_TOPIC_POOLS[areaId]["10-14"][0] ?? "";
}

export function pickRandomTopicFromPool(
  areaId: SoloTopicAreaId,
  ageBand: AgeBand,
): string {
  const poolList = getSoloTopicPool(areaId, ageBand);
  const i = Math.floor(Math.random() * poolList.length);
  return poolList[i] ?? poolList[0] ?? "";
}

/** Prefer a different line than `current`; if only one unique line, may repeat. */
export function pickDifferentSoloTopic(
  areaId: SoloTopicAreaId,
  ageBand: AgeBand,
  current: string,
): string {
  const poolList = [...getSoloTopicPool(areaId, ageBand)];
  const filtered = poolList.filter((line) => line !== current);
  const source = filtered.length > 0 ? filtered : poolList;
  const i = Math.floor(Math.random() * source.length);
  return source[i] ?? current;
}
