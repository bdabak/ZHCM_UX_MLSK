/*global QUnit*/

jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"hcm/ux/mlsk/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"hcm/ux/mlsk/test/integration/pages/Worklist",
	"hcm/ux/mlsk/test/integration/pages/Object",
	"hcm/ux/mlsk/test/integration/pages/NotFound",
	"hcm/ux/mlsk/test/integration/pages/Browser",
	"hcm/ux/mlsk/test/integration/pages/App"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "hcm.ux.mlsk.view."
	});

	sap.ui.require([
		"hcm/ux/mlsk/test/integration/WorklistJourney",
		"hcm/ux/mlsk/test/integration/ObjectJourney",
		"hcm/ux/mlsk/test/integration/NavigationJourney",
		"hcm/ux/mlsk/test/integration/NotFoundJourney",
		"hcm/ux/mlsk/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});