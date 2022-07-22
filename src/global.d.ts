type StudentLink = {
  link: string;
  img: string;
  name: string;
  rarity: number;
  school: string;
  playRole: string;
  position: string;
  attackType: string;
  armorType: string;
  combatClass: string;
  weaponType: string;
  bunker: string;
  urban: string;
  outdoors: string;
  indoors: string;
  releaseDate: string;
};

type Affinity = {
  urban: string;
  outdoors: string;
  indoors: string;
};

type CafeGift = {
  favorite: Array<string>;
  likes: Array<string>;
};

type Cafe = {
  interact: string | Array<string>;
  gift: CafeGift;
};

type StudentImages = {
  thumbnail: string;
  profile: string;
  fullArt: string;
};

type UniqueWeapon = {
  name: Array<string>;
  img: string;
  description: string;
};

type AbilityLevel = {
  cost?: number;
  level: number;
  description: string;
  upgrade?: Array<AbilityUpgrade>;
};

type AbilityUpgrade = {
  item: string;
  amount: number;
};

type Ability = {
  name: string;
  icon: string;
  levels: Array<AbilityLevel>;
};

type Skill = {
  ex: Ability;
  normal: Ability;
  passive: Ability;
  sub: Ability;
};

type Student = {
  name: string;
  rarity: number;
  background?: string;
  school: string;
  playRole: string;
  position: string;
  attackType: string;
  armorType: string;
  combatClass: string;
  affinity: Affinity;
  weaponType: string;
  bunker?: boolean;
  equip1?: string;
  equip2?: string;
  equip3?: string;
  fullName?: string;
  age?: number;
  birthday?: string;
  height?: number;
  hobbies?: string;
  illustrator?: string;
  voiceActress?: string;
  releaseDate: string;
  stats?: any;
  bonusAffection?: Map<number, string>;
  skills?: any;
  uniqueWeapon?: UniqueWeapon;
  cafe?: Cafe;
  images?: StudentImages;
};
