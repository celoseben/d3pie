require.config({
	baseUrl: "",
	paths: {

		// core stuff
		text: "core/libs/text",
		hbs: "core/libs/hbs",
		handlebars: "core/libs/handlebars.dev",
		handlebarsHelpers: "core/handlebarsHelpers",
		constants: "core/constants",
		pageHelper: "core/pageHelper",

		// About page
		aboutPage: "pages/about/aboutPage",
		aboutPageTemplate: "pages/about/aboutPage.hbs",

		// Documentation page
		documentationPage: "pages/documentation/documentationPage",
		documentationPageTemplate: "pages/documentation/documentationPage.hbs",

		// Download page
		downloadPage: "pages/download/downloadPage",
		downloadPageTemplate: "pages/download/downloadPage.hbs",

		// Generator page
		generatorPage: "pages/generator/generatorPage",
		generatorTabs: "pages/generator/generatorTabs",
		pieChartGenerator: "pages/generator/pieChartGenerator",
		examplePiesTemplate: "pages/generator/examplePies.hbs",
		generatorPageTemplate: "pages/generator/generatorPage.hbs",

		dataTab: "pages/generator/tabData.hbs",
		effectsTab: "pages/generator/tabEffects.hbs",
		labelsTab: "pages/generator/tabLabels.hbs",
		miscTab: "pages/generator/tabMisc.hbs",
		stylesTab: "pages/generator/tabStyles.hbs",
		titleTab: "pages/generator/tabTitle.hbs"
	}
});