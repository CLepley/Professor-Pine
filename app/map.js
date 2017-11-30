"use strict";

const log = require('loglevel').getLogger('Map'),
	fs = require('fs'),
	querystring = require('querystring'),
	request = require('request-promise'),
	ToGeoJSON = require('togeojson-with-extended-style'),
	turf = require('@turf/turf'),
	DOMParser = require('xmldom').DOMParser;

class Map {
	constructor() {
		const map = fs.readFileSync(require.resolve('PgP-Data/data/map.kml'), 'utf8'),
			kml = new DOMParser().parseFromString(map);

		this.regions = ToGeoJSON.kml(kml).features
			.filter(feature => feature.geometry.type === 'Polygon');

		// flip order of coordinates so they're in the right order according to what turf expects
		this.regions.forEach(region => {
			region.geometry.coordinates[0].reverse();
		});

		this.bounds = turf.bbox(turf.featureCollection(this.regions));
	}

	async getRegions(location) {
		const uri = 'http://nominatim.openstreetmap.org/search/query?format=json&bounded=1&limit=5&polygon_geojson=1' +
			`&viewbox=${this.bounds.join(',')}&q=${querystring.escape(location)}`;

		return await request({
			uri,
			json: true
		}).then(body => {
			const results = body
				.map(body => body.geojson);

			if (results.length === 0) {
				// No matches
				return [];
			}

			// Sort largest results to be first
			results.sort((a, b) => turf.area(b) - turf.area(a));

			const searched_region = results[0];

			switch (searched_region.type) {
				case 'Polygon':
					return this.findMatches(searched_region);
				case 'MultiPolygon':
					const matching_regions = new Set();

					searched_region.coordinates
						.map(coordinates => turf.polygon(coordinates))
						.forEach(polygon => {
							this.findMatches(polygon)
								.forEach(matching_region => matching_regions.add(matching_region));
						});

					return Array.from(matching_regions.values());
				case 'Point':
					return this.findMatch(searched_region);
			}
		}).catch(err => log.error(err));
	}

	findMatches(polygon) {
		return this.regions
			.filter(region => turf.intersect(polygon, region) !== null)
			.map(region => region.properties.name);
	}


	findMatch(point) {
		return this.regions
			.filter(region => turf.inside(point, region) === true)
			.map(region => region.properties.name);
	}
}

module.exports = new Map();