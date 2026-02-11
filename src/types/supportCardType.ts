export type CardType = "speed" | "stamina" | "power" | "guts" | "wit" | "pals";
export type CardRarity = "ssr" | "sr" | "any";

const supportCardSpeedSSR = [
  "Biko Pegasus",
  "Nishino Flower",
  "Sakura Bakushin O",
  "Gold City",
  "Tokai Teio",
  "Silence Suzuka",
  "Special Week",
  "Twin Turbo",
  "Kitasan Black",
  "Kawakami Princess",
  "Gold Ship",
  "Narita Brian",
  "Sweep Tosho",
  "Zenno Rob Roy",
  "Mayano Top Gun",
  "Silence Suzuka Story",
  "Matikanefukukitaru",
] as const;

const supportCardSpeedSR = [
  "Vodka",
  "Shinko Windy",
  "Sweep Tosho",
  "Eishin Flash",
  "Narita Taishin",
  "King Halo",
] as const;

const supportCardStaminaSSR = [
  "Rice Shower",
  "Mejiro McQueen",
  "Super Creek",
  "Tamamo Cross",
  "Seiun Sky",
  "Gold SHip",
  "Satono Diamond",
  "Sakura Chiyono O",
  "Winning Ticket",
  "Silence Suzuka",
  "Nakayama Festa",
  "Narita Brian",
  "Manhattan Cafe",
  "Meisho Doto",
] as const;

const supportCardStaminaSR = [
  "Manhattan Cafe",
  "Mayano Top Gun",
  "Zenno Rob Roy",
  "Tosen Jodan",
] as const;

const supportCardPowerSSR = [
  "Smart Falcon",
  "El Condor Pasa",
  "Vodka",
  "Oguri Cap",
  "Winning Ticket",
  "Yaeno Muteki",
  "Bamboo Memory",
  "King Halo",
  "Daiwa Scarlet",
  "Rice Shower",
  "Tamamo Cross",
  "Daitaku Helios",
  "Marvelous Sunday",
  "Admire Vega",
] as const;

const supportCardPowerSR = [
  "Mejiro Ryan",
  "Mihono Bourbon",
  "Biwa Hayahide",
  "Agnes Digital",
  "Hishi Amazon",
  "Daitaku Helios",
  "Nishino Flower",
  "Fine Motion",
  "Inari One",
] as const;

const supportCardGutsSSR = [
  "Haru Urara",
  "Winning Ticket",
  "Ines Fujin",
  "Grass Wonder",
  "Special Week",
  "Mejiro Palmer",
  "Matikanetannhauser",
  "Hishi Akebono",
  "Mejiro Ryan",
  "Ikuno Dictus",
  "Yukino Bijin",
] as const;

const supportCardGutsSR = [
  "Nice Nature",
  "Meisho Doto",
  "Yukino Bijin",
  "Air Groove",
  "Seeking the Pearl",
  "Sirius Symboli",
  "Tamamo Cross",
] as const;

const supportCardWitSSR = [
  "Air Shakur",
  "Fine Motion",
  "Yukino Bijin",
  "Mejiro Dober",
  "Seiun Sky",
  "Nice Nature",
  "Mihono Bourbon",
  "Curren Chan",
  "Narita Taishin",
] as const;

const supportCardWitSR = [
  "Mejiro Dober",
  "Matikanefukukitaru",
  "Marvelous Sunday",
  "Agnes Tachyon",
  "Daiwa Scarlet",
  "Fuji Kiseki",
  "Ikuno Dictus",
  "Nice Nature",
  "Mejiro Ardan",
] as const;

const supportCardPals = [
  "Kiryuin",
  "Tazuna",
  "Riko",
  "Anshinzawa"
] as const;

export type SupportCardSpeedSSR = typeof supportCardSpeedSSR[number];
export type SupportCardSpeedSR = typeof supportCardSpeedSR[number];
export type SupportCardStaminaSSR = typeof supportCardStaminaSSR[number];
export type SupportCardStaminaSR = typeof supportCardStaminaSR[number];
export type SupportCardPowerSSR = typeof supportCardPowerSSR[number];
export type SupportCardPowerSR = typeof supportCardPowerSR[number];
export type SupportCardGutsSSR = typeof supportCardGutsSSR[number];
export type SupportCardGutsSR = typeof supportCardGutsSR[number];
export type SupportCardWitSSR = typeof supportCardWitSSR[number];
export type SupportCardWitSR = typeof supportCardWitSR[number];
export type SupportCardPals = typeof supportCardPals[number];

export type SupportCardName =
  | SupportCardSpeedSSR
  | SupportCardSpeedSR
  | SupportCardStaminaSSR
  | SupportCardStaminaSR
  | SupportCardPowerSSR
  | SupportCardPowerSR
  | SupportCardGutsSSR
  | SupportCardGutsSR
  | SupportCardWitSSR
  | SupportCardWitSR
  | SupportCardPals;

export type SupportCardSpeedSSRProps = {
  type: "speed";
  rarity: "ssr";
  name: SupportCardSpeedSSR;
  width?: number;
  description?: string;
};

export type SupportCardSpeedSRProps = {
  type: "speed";
  rarity: "sr";
  name: SupportCardSpeedSR;
  width?: number;
  description?: string;
};

export type SupportCardStaminaSSRProps = {
  type: "stamina";
  rarity: "ssr";
  name: SupportCardStaminaSSR;
  width?: number;
  description?: string;
};

export type SupportCardStaminaSRProps = {
  type: "stamina";
  rarity: "sr";
  name: SupportCardStaminaSR;
  width?: number;
  description?: string;
};

export type SupportCardPowerSSRProps = {
  type: "power";
  rarity: "ssr";
  name: SupportCardPowerSSR;
  width?: number;
  description?: string;
};

export type SupportCardPowerSRProps = {
  type: "power";
  rarity: "sr";
  name: SupportCardPowerSR;
  width?: number;
  description?: string;
};

export type SupportCardGutsSSRProps = {
  type: "guts";
  rarity: "ssr";
  name: SupportCardGutsSSR;
  width?: number;
  description?: string;
};

export type SupportCardGutsSRProps = {
  type: "guts";
  rarity: "sr";
  name: SupportCardGutsSR;
  width?: number;
  description?: string;
};

export type SupportCardWitSSRProps = {
  type: "wit";
  rarity: "ssr";
  name: SupportCardWitSSR;
  width?: number;
  description?: string;
};

export type SupportCardWitSRProps = {
  type: "wit";
  rarity: "sr";
  name: SupportCardWitSR;
  width?: number;
  description?: string;
};

export type SupportCardPalsProps = {
  type: "pals";
  rarity: "any";
  name: SupportCardPals;
  width?: number;
  description?: string;
};

export type SupportCardProps =
  | SupportCardSpeedSSRProps
  | SupportCardSpeedSRProps
  | SupportCardStaminaSSRProps
  | SupportCardStaminaSRProps
  | SupportCardPowerSSRProps
  | SupportCardPowerSRProps
  | SupportCardGutsSSRProps
  | SupportCardGutsSRProps
  | SupportCardWitSSRProps
  | SupportCardWitSRProps
  | SupportCardPalsProps
