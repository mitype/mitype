// Cottage Bakery Masterclass: state by state rules finder data.
//
// Compiled from published state summaries that were checked against state
// agency pages, statutes, and university extension guides as of
// September 30, 2026. These rules change often (several change within the
// next year, see `upcoming`), so the finder always tells learners to
// confirm with the linked state agency before their first sale.
//
// To refresh: update the fields below, change STATE_RULES_VERIFIED_ON, and
// redeploy. Plan a review every quarter and every January.
//
// No dashes in learner facing text, per the Black Sheep University style.

export const STATE_RULES_VERIFIED_ON = 'September 30, 2026';

export interface StateRule {
  state: string;
  /** Yearly sales cap, as stated by the state. */
  cap: string;
  /** License, permit, registration, or training needed before selling. */
  permit: string;
  /** Online orders and shipping rules for the basic cottage food path. */
  online: string;
  /** A rule change that is scheduled but not yet in effect. */
  upcoming?: string;
  /** Starting point for the state's food regulatory agency. */
  agencyUrl: string;
}

export const STATE_RULES: StateRule[] = [
  {
    state: 'Alabama',
    cap: 'No cap',
    permit: 'No state permit. Your county reviews your food safety certificate and labels (county fee varies).',
    online: 'Online and phone orders are OK for buyers in Alabama. Delivery in person or by mail inside Alabama.',
    agencyUrl: 'https://www.alabamapublichealth.gov/foodsafety/',
  },
  {
    state: 'Alaska',
    cap: 'No statewide cap',
    permit: 'No state food permit.',
    online: 'Sales must happen in Alaska. No interstate sales. The law does not mention online orders.',
    agencyUrl: 'https://dec.alaska.gov/eh/fss/',
  },
  {
    state: 'Arizona',
    cap: 'No cap',
    permit: 'Register with the state health department and get a food handler card.',
    online: 'Online is OK. Products without dairy or meat can go by a third party carrier. Dairy and meat products are delivered in person.',
    agencyUrl: 'https://www.azdhs.gov/preparedness/epidemiology-disease-control/food-safety-environmental-services/',
  },
  {
    state: 'Arkansas',
    cap: 'No cap',
    permit: 'None. An optional ID number is available for your label.',
    online: 'Online, mail, and parcel delivery are OK. Out of state sales only if you follow federal law.',
    agencyUrl: 'https://www.healthy.arkansas.gov/programs-services/topics/food-protection',
  },
  {
    state: 'California',
    cap: 'Class A $88,878. Class B $177,756 (2026). Adjusted every January 1.',
    permit: 'County registration (Class A) or county permit with an inspection (Class B), renewed yearly, county fee.',
    online: 'Online and phone orders are OK. Delivery in person, by mail, or by a delivery service.',
    agencyUrl: 'https://www.cdph.ca.gov/Programs/CEH/DFDCS/Pages/FDBPrograms/FoodSafetyProgram.aspx',
  },
  {
    state: 'Colorado',
    cap: '$10,000 per product through 2026.',
    permit: 'No license today. A food safety course is required.',
    online: 'Online is OK. Delivery is arranged with the buyer, inside Colorado only.',
    upcoming: 'January 1, 2027: a $150,000 total cap (adjusted for inflation each year) replaces the per product cap, and yearly state registration starts.',
    agencyUrl: 'https://cdphe.colorado.gov/retail-food-restaurants-and-grocery-stores',
  },
  {
    state: 'Connecticut',
    cap: '$50,000',
    permit: '$50 state license, renewed every year.',
    online: 'Online orders are OK. You deliver in person inside Connecticut. No mail.',
    agencyUrl: 'https://portal.ct.gov/DCP/Agency-Administration/Division-Home-Pages/Food-and-Standards-Division',
  },
  {
    state: 'Delaware',
    cap: 'No cap',
    permit: '$30 a year state registration permit, a food safety course, and an inspection.',
    online: 'Online sales are not allowed (online ads are). Direct sales in Delaware only.',
    agencyUrl: 'https://www.dhss.delaware.gov/dhss/dph/hsp/ofp.html',
  },
  {
    state: 'Florida',
    cap: '$250,000',
    permit: 'None.',
    online: 'Online and mail order are OK. Delivery in person or by USPS or a mail carrier. No wholesale.',
    agencyUrl: 'https://www.fdacs.gov/Divisions-Offices/Food-Safety',
  },
  {
    state: 'Georgia',
    cap: 'No cap',
    permit: 'No license since July 1, 2025. A food safety course is required.',
    online: 'Online and mail order are OK to buyers in Georgia. Stores and restaurants can buy from you.',
    agencyUrl: 'https://agr.georgia.gov/food-safety',
  },
  {
    state: 'Hawaii',
    cap: 'No cap',
    permit: 'No permit. Food safety certification is required.',
    online: 'Online, phone, mail, and shipping are OK under rules in effect since August 24, 2025.',
    agencyUrl: 'https://health.hawaii.gov/san/',
  },
  {
    state: 'Idaho',
    cap: 'No cap',
    permit: 'None (law in effect March 20, 2026). Keep records for at least 2 years.',
    online: 'Every sale and delivery must happen inside Idaho.',
    agencyUrl: 'https://healthandwelfare.idaho.gov/health-wellness/community-health/food-safety',
  },
  {
    state: 'Illinois',
    cap: 'No cap',
    permit: 'Yearly local health department registration, fee capped at $50.',
    online: 'Online is OK. Shelf stable foods can ship inside Illinois, never out of state.',
    agencyUrl: 'https://dph.illinois.gov/topics-services/food-safety.html',
  },
  {
    state: 'Indiana',
    cap: 'No cap',
    permit: 'None. A food handler certificate is required.',
    online: 'Online and phone orders are OK. Mail or carrier delivery inside Indiana only.',
    agencyUrl: 'https://www.in.gov/health/eph/food-protection-program/',
  },
  {
    state: 'Iowa',
    cap: 'No cap',
    permit: 'None.',
    online: 'Online and phone orders are OK. Delivery by you, an agent, or mail.',
    agencyUrl: 'https://dia.iowa.gov/food/business-licensing',
  },
  {
    state: 'Kansas',
    cap: 'No cap',
    permit: 'No license for listed shelf stable foods. A sales tax certificate is required.',
    online: 'Online is OK, and you can ship to the customer\'s home.',
    agencyUrl: 'https://agriculture.ks.gov/divisions-programs/food-safety-lodging/starting-a-food-business',
  },
  {
    state: 'Kentucky',
    cap: '$60,000',
    permit: '$50 a year state registration as a home based processor.',
    online: 'Online orders are OK. Pickup or delivery inside Kentucky.',
    agencyUrl: 'https://chfs.ky.gov/agencies/dph/dphps/fsb/Pages/default.aspx',
  },
  {
    state: 'Louisiana',
    cap: '$100,000 (since August 1, 2026, up from $30,000). The cap covers breads, cakes, cookies, and pies too.',
    permit: 'No permit. A parish sales tax certificate is required.',
    online: 'The law does not address online orders or shipping. No selling baked goods to stores for resale.',
    agencyUrl: 'https://ldh.la.gov/page/632',
  },
  {
    state: 'Maine',
    cap: 'Not listed on the state page',
    permit: '$20 a year Home Food License with a first inspection.',
    online: 'License holders can sell from home and wholesale across Maine and the US.',
    agencyUrl: 'https://www.maine.gov/dacf/qar/',
  },
  {
    state: 'Maryland',
    cap: '$100,000 (since October 1, 2026, up from $50,000).',
    permit: 'None for direct sales. A free state review to sell to stores.',
    online: 'Personal delivery and mail delivery inside Maryland. State guidelines do not mention online orders. No out of state sales.',
    agencyUrl: 'https://health.maryland.gov/phpa/OEHFP/OFPCHS/Pages/home.aspx',
  },
  {
    state: 'Massachusetts',
    cap: 'Not listed on the state page',
    permit: 'Permit from your local board of health. Fee set by the local board.',
    online: 'Internet and mail sales count as direct sales. Out of state buyers must also meet federal law and their own state\'s law.',
    agencyUrl: 'https://www.mass.gov/food-safety',
  },
  {
    state: 'Michigan',
    cap: '$50,000 ($75,000 if every product sells for $250 or more).',
    permit: 'None.',
    online: 'Internet and mail order are OK if the buyer can talk to you before buying.',
    agencyUrl: 'https://www.michigan.gov/mdard/food-dairy',
  },
  {
    state: 'Minnesota',
    cap: '$78,000',
    permit: 'State registration. Free up to $7,665 in sales, $50 above.',
    online: 'Online orders are OK, handed over in person in Minnesota.',
    upcoming: 'August 1, 2027: in state shipping allowed, one $30 yearly registration fee for everyone, and advanced training for every registrant.',
    agencyUrl: 'https://www.mda.state.mn.us/food-feed',
  },
  {
    state: 'Mississippi',
    cap: '$35,000',
    permit: 'None.',
    online: 'No online sales. Direct to consumers in Mississippi (online advertising is fine).',
    agencyUrl: 'https://msdh.ms.gov/page/43,0,377.html',
  },
  {
    state: 'Missouri',
    cap: 'No cap',
    permit: 'None.',
    online: 'Online is OK only when you and the buyer are both in Missouri.',
    agencyUrl: 'https://health.mo.gov/safety/foodsafety/',
  },
  {
    state: 'Montana',
    cap: 'No cap',
    permit: 'None under the Local Food Choice Act.',
    online: 'Direct to the informed end consumer in Montana. No interstate sales.',
    agencyUrl: 'https://dphhs.mt.gov/publichealth/FCSS',
  },
  {
    state: 'Nebraska',
    cap: 'Not listed on the state page',
    permit: 'State registration (not needed for shelf stable foods sold only at farmers markets) and a food safety course.',
    online: 'Online is OK. Shelf stable foods can go by mail or carrier. Refrigerated foods are hand delivered.',
    agencyUrl: 'https://nda.nebraska.gov/food/index.html',
  },
  {
    state: 'Nevada',
    cap: '$100,000 a year, adjusted for inflation.',
    permit: 'Register with your local health authority (Clark County charges $220).',
    online: 'The statute bans phone and internet sales until June 30, 2027. The Southern Nevada Health District lets you take phone or internet orders that you deliver in person.',
    upcoming: 'July 1, 2027: phone and online sales, with mail or delivery service fulfillment, become allowed.',
    agencyUrl: 'https://dpbh.nv.gov/Reg/Food/Food_Establishments_Home/',
  },
  {
    state: 'New Hampshire',
    cap: 'Not listed on the state page',
    permit: 'None to sell from home, a farm stand, a farmers market, or a retail store. A $150 Homestead license is needed for more.',
    online: 'Internet and mail order need the $150 Homestead license.',
    agencyUrl: 'https://www.dhhs.nh.gov/programs-services/environmental-health-and-you/food-protection',
  },
  {
    state: 'New Jersey',
    cap: '$50,000',
    permit: '$100 state permit, good for 2 years.',
    online: 'Online orders and payment are OK. Hand off in person in New Jersey. No shipping.',
    agencyUrl: 'https://www.nj.gov/health/ceohs/food-drug-safety/',
  },
  {
    state: 'New Mexico',
    cap: 'Not listed on the state page',
    permit: 'No permit. A food handler card is required.',
    online: 'Online sales and mail delivery inside New Mexico only.',
    agencyUrl: 'https://www.env.nm.gov/food/',
  },
  {
    state: 'New York',
    cap: 'Not listed on the state page',
    permit: 'Free home processor registration, no expiration.',
    online: 'Internet sales inside New York only. No out of state shipping.',
    agencyUrl: 'https://agriculture.ny.gov/food-safety',
  },
  {
    state: 'North Carolina',
    cap: 'Not listed on the state page',
    permit: 'Home kitchen inspection by the state. No permit is issued.',
    online: 'Labeled products can be shipped by USPS or FedEx. The state page does not say whether that is in state only.',
    agencyUrl: 'https://www.ncagr.gov/food-drug-protection',
  },
  {
    state: 'North Dakota',
    cap: 'No cap',
    permit: 'None.',
    online: 'Online, mail, and out of state sales have been allowed since 2025, except poultry. The buyer\'s state law still applies.',
    agencyUrl: 'https://www.health.nd.gov/food-lodging',
  },
  {
    state: 'Ohio',
    cap: 'No cap',
    permit: 'None.',
    online: 'Sales inside Ohio only. Out of state sales are prohibited.',
    agencyUrl: 'https://agri.ohio.gov/divisions/food-safety',
  },
  {
    state: 'Oklahoma',
    cap: '$75,000 until November 1, 2026.',
    permit: 'None. An optional $15 a year registration number is available.',
    online: 'Online and phone orders are OK. Shelf stable foods can go by a parcel service.',
    upcoming: 'November 1, 2026: the cap rises to $250,000.',
    agencyUrl: 'https://ag.ok.gov/food-safety/',
  },
  {
    state: 'Oregon',
    cap: '$52,700 (2026)',
    permit: 'None. Food handler training is required.',
    online: 'Online and mail are OK. Out of state sales depend on the buyer\'s state.',
    agencyUrl: 'https://www.oregon.gov/oda/programs/FoodSafety/Pages/default.aspx',
  },
  {
    state: 'Pennsylvania',
    cap: 'Not listed on the state page',
    permit: '$35 Limited Food Establishment registration plus a state inspection.',
    online: 'Internet sales are OK. Selling across state lines may also need FDA registration.',
    agencyUrl: 'https://www.agriculture.pa.gov/consumer_protection/FoodSafety/Pages/default.aspx',
  },
  {
    state: 'Rhode Island',
    cap: '$50,000',
    permit: '$65 a year state registration and a food safety course.',
    online: 'Online, mail, and phone orders are OK, delivered in person inside Rhode Island.',
    agencyUrl: 'https://health.ri.gov/programs/detail.php?pgm_id=1096',
  },
  {
    state: 'South Carolina',
    cap: 'No cap',
    permit: 'None. An optional ID number is available for your label.',
    online: 'Online and mail order are OK. Retail stores can sell your products.',
    agencyUrl: 'https://scdhec.gov/food-safety',
  },
  {
    state: 'South Dakota',
    cap: 'No cap',
    permit: 'Nothing for direct sales. $40 training for canned, fermented, and perishable foods.',
    online: 'Internet sales count as indirect and need a state license. Personal delivery only.',
    agencyUrl: 'https://doh.sd.gov/licensing/food-lodging/',
  },
  {
    state: 'Tennessee',
    cap: 'No cap',
    permit: 'None (Food Freedom Act).',
    online: 'Shelf stable foods: online, phone, and carrier delivery inside Tennessee. Perishable foods in person.',
    agencyUrl: 'https://www.tn.gov/agriculture/businesses/food-and-dairy.html',
  },
  {
    state: 'Texas',
    cap: '$150,000, adjusted for inflation.',
    permit: 'None. State registration only for refrigerated (TCS) foods.',
    online: 'Online is OK when you, an employee, or a household member delivers in person. No shipping.',
    agencyUrl: 'https://www.dshs.texas.gov/retail-food-establishments/permits-retail-food-establishments/texas-cottage-food-production',
  },
  {
    state: 'Utah',
    cap: 'Not listed on the state page',
    permit: 'Registration with a nonrefundable fee, a food handler permit, and an inspection.',
    online: 'Sales inside Utah only, direct or to stores for resale.',
    agencyUrl: 'https://ag.utah.gov/food-safety/',
  },
  {
    state: 'Vermont',
    cap: '$30,000 (exemption)',
    permit: 'No license. Yearly online training and an exemption form filed before January 15.',
    online: 'The state page does not address online sales.',
    agencyUrl: 'https://agriculture.vermont.gov/food-safety-consumer-protection',
  },
  {
    state: 'Virginia',
    cap: 'None for low risk foods. $9,000 for pickles and acidified vegetables.',
    permit: 'None.',
    online: 'Online and phone orders are OK. Delivery in person, by mail, or by delivery service to buyers in Virginia.',
    agencyUrl: 'https://www.vdacs.virginia.gov/food-food-safety.shtml',
  },
  {
    state: 'Washington',
    cap: '$35,000',
    permit: '$355 state permit for 2 years, with a home kitchen inspection.',
    online: 'No internet sales. A website can show products, but each sale is completed in person. No shipping.',
    agencyUrl: 'https://agr.wa.gov/departments/food-safety',
  },
  {
    state: 'West Virginia',
    cap: 'No cap',
    permit: 'None for shelf stable foods. A new permit applies to perishable (TCS) foods since June 12, 2026.',
    online: 'Remote sales are OK. Delivery by you, an agent, a store, or a carrier.',
    agencyUrl: 'https://oeps.wv.gov/food_safety/Pages/default.aspx',
  },
  {
    state: 'Wisconsin',
    cap: 'No cap on baked goods. $5,000 for home canned foods.',
    permit: 'None.',
    online: 'Baked goods direct to consumers. Home canned foods only at markets and events, no internet.',
    agencyUrl: 'https://datcp.wi.gov/Pages/Programs_Services/FoodSafety.aspx',
  },
  {
    state: 'Wyoming',
    cap: '$250,000 and 250,000 products.',
    permit: 'None.',
    online: 'Inside Wyoming only. Delivery at a place you and the buyer agree on.',
    agencyUrl: 'https://agriculture.wy.gov/divisions/chs',
  },
];
