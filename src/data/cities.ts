export interface City {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  country: "US" | "CA";
  population: number;
  areaCodes: string[];
}

// Top 30 US cities by population + Top 10 Canadian cities
export const cities: City[] = [
  // United States - Top 30
  { slug: "new-york", name: "New York", state: "New York", stateCode: "NY", country: "US", population: 8336817, areaCodes: ["212", "718", "917", "347", "646"] },
  { slug: "los-angeles", name: "Los Angeles", state: "California", stateCode: "CA", country: "US", population: 3979576, areaCodes: ["213", "310", "323", "424", "818"] },
  { slug: "chicago", name: "Chicago", state: "Illinois", stateCode: "IL", country: "US", population: 2693976, areaCodes: ["312", "773", "872"] },
  { slug: "houston", name: "Houston", state: "Texas", stateCode: "TX", country: "US", population: 2320268, areaCodes: ["713", "281", "832", "346"] },
  { slug: "phoenix", name: "Phoenix", state: "Arizona", stateCode: "AZ", country: "US", population: 1680992, areaCodes: ["602", "480", "623"] },
  { slug: "philadelphia", name: "Philadelphia", state: "Pennsylvania", stateCode: "PA", country: "US", population: 1584064, areaCodes: ["215", "267", "445"] },
  { slug: "san-antonio", name: "San Antonio", state: "Texas", stateCode: "TX", country: "US", population: 1547253, areaCodes: ["210", "726"] },
  { slug: "san-diego", name: "San Diego", state: "California", stateCode: "CA", country: "US", population: 1423851, areaCodes: ["619", "858"] },
  { slug: "dallas", name: "Dallas", state: "Texas", stateCode: "TX", country: "US", population: 1343573, areaCodes: ["214", "469", "972"] },
  { slug: "san-jose", name: "San Jose", state: "California", stateCode: "CA", country: "US", population: 1021795, areaCodes: ["408", "669"] },
  { slug: "austin", name: "Austin", state: "Texas", stateCode: "TX", country: "US", population: 978908, areaCodes: ["512", "737"] },
  { slug: "jacksonville", name: "Jacksonville", state: "Florida", stateCode: "FL", country: "US", population: 911507, areaCodes: ["904"] },
  { slug: "fort-worth", name: "Fort Worth", state: "Texas", stateCode: "TX", country: "US", population: 909585, areaCodes: ["817", "682"] },
  { slug: "columbus", name: "Columbus", state: "Ohio", stateCode: "OH", country: "US", population: 905748, areaCodes: ["614", "380"] },
  { slug: "charlotte", name: "Charlotte", state: "North Carolina", stateCode: "NC", country: "US", population: 874579, areaCodes: ["704", "980"] },
  { slug: "indianapolis", name: "Indianapolis", state: "Indiana", stateCode: "IN", country: "US", population: 876384, areaCodes: ["317", "463"] },
  { slug: "san-francisco", name: "San Francisco", state: "California", stateCode: "CA", country: "US", population: 873965, areaCodes: ["415", "628"] },
  { slug: "seattle", name: "Seattle", state: "Washington", stateCode: "WA", country: "US", population: 737015, areaCodes: ["206", "253"] },
  { slug: "denver", name: "Denver", state: "Colorado", stateCode: "CO", country: "US", population: 727211, areaCodes: ["303", "720"] },
  { slug: "washington-dc", name: "Washington", state: "District of Columbia", stateCode: "DC", country: "US", population: 689545, areaCodes: ["202"] },
  { slug: "boston", name: "Boston", state: "Massachusetts", stateCode: "MA", country: "US", population: 675647, areaCodes: ["617", "857"] },
  { slug: "nashville", name: "Nashville", state: "Tennessee", stateCode: "TN", country: "US", population: 689447, areaCodes: ["615", "629"] },
  { slug: "detroit", name: "Detroit", state: "Michigan", stateCode: "MI", country: "US", population: 639111, areaCodes: ["313", "586", "248"] },
  { slug: "portland", name: "Portland", state: "Oregon", stateCode: "OR", country: "US", population: 652503, areaCodes: ["503", "971"] },
  { slug: "las-vegas", name: "Las Vegas", state: "Nevada", stateCode: "NV", country: "US", population: 641903, areaCodes: ["702", "725"] },
  { slug: "memphis", name: "Memphis", state: "Tennessee", stateCode: "TN", country: "US", population: 633104, areaCodes: ["901"] },
  { slug: "baltimore", name: "Baltimore", state: "Maryland", stateCode: "MD", country: "US", population: 585708, areaCodes: ["410", "443", "667"] },
  { slug: "milwaukee", name: "Milwaukee", state: "Wisconsin", stateCode: "WI", country: "US", population: 577222, areaCodes: ["414"] },
  { slug: "albuquerque", name: "Albuquerque", state: "New Mexico", stateCode: "NM", country: "US", population: 564559, areaCodes: ["505"] },
  { slug: "tucson", name: "Tucson", state: "Arizona", stateCode: "AZ", country: "US", population: 542629, areaCodes: ["520"] },
  
  // Canada - Top 10
  { slug: "toronto", name: "Toronto", state: "Ontario", stateCode: "ON", country: "CA", population: 2731571, areaCodes: ["416", "647", "437"] },
  { slug: "montreal", name: "Montreal", state: "Quebec", stateCode: "QC", country: "CA", population: 1762949, areaCodes: ["514", "438"] },
  { slug: "vancouver", name: "Vancouver", state: "British Columbia", stateCode: "BC", country: "CA", population: 631486, areaCodes: ["604", "778", "236"] },
  { slug: "calgary", name: "Calgary", state: "Alberta", stateCode: "AB", country: "CA", population: 1239220, areaCodes: ["403", "587", "825"] },
  { slug: "edmonton", name: "Edmonton", state: "Alberta", stateCode: "AB", country: "CA", population: 981280, areaCodes: ["780", "587", "825"] },
  { slug: "ottawa", name: "Ottawa", state: "Ontario", stateCode: "ON", country: "CA", population: 934243, areaCodes: ["613", "343"] },
  { slug: "winnipeg", name: "Winnipeg", state: "Manitoba", stateCode: "MB", country: "CA", population: 749607, areaCodes: ["204", "431"] },
  { slug: "quebec-city", name: "Quebec City", state: "Quebec", stateCode: "QC", country: "CA", population: 531902, areaCodes: ["418", "581"] },
  { slug: "hamilton", name: "Hamilton", state: "Ontario", stateCode: "ON", country: "CA", population: 536917, areaCodes: ["905", "289", "365"] },
  { slug: "kitchener", name: "Kitchener", state: "Ontario", stateCode: "ON", country: "CA", population: 256885, areaCodes: ["519", "226", "548"] },
];

// Helper to find city by slug
export const getCityBySlug = (slug: string): City | undefined => {
  return cities.find(city => city.slug === slug);
};

// Get cities by country
export const getCitiesByCountry = (country: "US" | "CA"): City[] => {
  return cities.filter(city => city.country === country);
};

// Get all city slugs for sitemap generation
export const getAllCitySlugs = (): string[] => {
  return cities.map(city => city.slug);
};
