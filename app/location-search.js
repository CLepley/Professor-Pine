"use strict";

const lunr = require('lunr'),
	he = require('he'),
	Search = require('./search');

// Maps from regions (channel name) to gym ids within them
const region_gyms = new Map();

class LocationSearch extends Search {
	constructor() {
		super();

		console.log('Indexing Gym Data...');

		this.index = lunr(function () {
			// reference will be the entire gym object so we can grab whatever we need from it (GPS coordinates, name, etc.)
			this.ref('object');

			// static fields for gym name and description
			this.field('name');
			this.field('description');

			// fields from geocoding data, can add more if / when needed
			this.field('intersection');
			this.field('route');
			this.field('neighborhood');
			this.field('colloquial_area');
			this.field('locality');
			this.field('premise');
			this.field('natural_feature');
			this.field('postal_code');
			this.field('bus_station');
			this.field('establishment');
			this.field('point_of_interest');
			this.field('transit_station');

			const gymDatabase = require('./../data/gyms'),
				regions = require('./../data/regions');

			gymDatabase.forEach(function (gym) {
				// Gym document is a object with its reference and fields to collection of values
				const gymDocument = Object.create(null);

				// reference
				gymDocument['object'] = he.decode(JSON.stringify(gym));

				// static fields
				gymDocument['name'] = he.decode(gym.gymName);
				gymDocument['description'] = he.decode(gym.gymInfo.gymDescription);

				// Build a map of the geocoded information:
				//   key is the address component's type
				//   value is a set of that type's values across all address components
				const addressInfo = new Map();
				gym.gymInfo.addressComponents.forEach(function (addressComponent) {
					addressComponent.addressComponents.forEach(function (addComp) {
						addComp.types.forEach(function (type) {
							const typeKey = type.toLowerCase();
							let values = addressInfo.get(typeKey);

							if (!values) {
								values = new Set();
								addressInfo.set(typeKey, values);
							}
							values.add(addComp.shortName);
						});
					});
				});

				// Insert geocoded map info into map
				addressInfo.forEach(function (value, key) {
					gymDocument[key] = Array.from(value).join(' ');
				});

				if (!addressInfo.has('postal_code')) {
					console.log('Gym "' + gym.gymName + '" has no postal code information!');
				} else {
					// Add gym to appropriate regions (based on zipcodes to which it belongs)
					addressInfo.get('postal_code').forEach(zipcode => {
						const zipcode_regions = regions[zipcode];

						if (zipcode_regions) {
							zipcode_regions.forEach(region => {
								let current_region_gyms = region_gyms.get(region);

								if (!current_region_gyms) {
									current_region_gyms = new Set();
									region_gyms.set(region, current_region_gyms);
								}

								current_region_gyms.add(gym.gymId);
							});
						}
					});
				}

				// Actually add this gym to the Lunr db
				this.add(gymDocument);
			}, this);
		});

		console.log('Indexing Gym Data Complete');
	}

	search(channel_name, terms) {
		const lunr_results = super.search(terms);

		// This is a hacky way of doing an AND - it checks that a given match in fact matched
		// all terms in the query
		const anded_results = lunr_results
			.filter(result => {
				return Object.keys(result.matchData.metadata).length === terms.length;
			})
			.map(result => JSON.parse(result.ref));

		// Now filter results based on what channel this request came from
		return anded_results
			.filter(gym => {
				return region_gyms.get(channel_name).has(gym.gymId);
			});
	}
}

module.exports = new LocationSearch();
