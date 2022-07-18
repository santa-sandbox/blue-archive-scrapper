type StudentLink = {
  link: string;
  img: string;
};

type Affinity = {
  urban: string;
  outdoors: string;
  indoors: string;
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
  bonusAffection?: any;
  skills?: any;
  uniqueWeapon?: any;
  cafeFurniture?: any;
  gifts?: any;
};
