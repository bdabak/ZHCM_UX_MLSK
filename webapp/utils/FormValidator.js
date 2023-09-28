/*global sap */
sap.ui.define([
	'sap/ui/core/message/Message',
	'sap/ui/core/MessageType'
], function (Message, MessageType) {
	"use strict";

	/**
	 * @name        FormValidator
	 *
	 * @class       
	 * @classdesc   FormValidator class.<br/>
	 */
	var FormValidator = function (oController) {
		this._isValid = true;
		this._isValidationPerformed = false;
		this._referenceController = oController;
	};

	/**
	 * Returns true _only_ when the form validation has been performed, and no validation errors were found
	 * @memberof FormValidator
	 *
	 * @returns {boolean}
	 */
	FormValidator.prototype.isValid = function () {
		return this._isValidationPerformed && this._isValid;
	};

	/**
	 * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
	 * @memberof FormValidator
	 *
	 * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
	 * @return {boolean} whether the oControl is valid or not.
	 */
	FormValidator.prototype.validate = function (oControl) {
		this._isValid = true;
		sap.ui.getCore().getMessageManager().removeAllMessages();
		this._validate(oControl);
		return this.isValid();
	};

	FormValidator.prototype.clearTraces = function (oControl) {
		sap.ui.getCore().getMessageManager().removeAllMessages();
		this._clearTraces(oControl);
	};

	/**
	 * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
	 * @memberof FormValidator
	 *
	 * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
	 */
	FormValidator.prototype._validate = function (oControl) {
		var aPossibleAggregations = ["items", "content", "headerContainer", "_header", "form", "formContainers", "formElements", "fields",
				"_dynamicPage"
			],
			aControlAggregation = null,
			oControlBinding = null,
			aValidateProperties = ["value", "selectedKey", "text", "dateValue"], // yes, I want to validate Select and Text controls too
			isValidatedControl = false,
			oExternalValue, oInternalValue,
			targetControl = null,
			i, j;

		// only validate controls and elements which have a 'visible' property
		if (oControl instanceof sap.ui.core.Control ||
			oControl instanceof sap.ui.layout.form.FormContainer ||
			oControl instanceof sap.ui.layout.form.FormElement) {

			// only check visible controls (invisible controls make no sense checking)
			if (oControl.getVisible()) {

				// check control for any properties worth validating 
				for (i = 0; i < aValidateProperties.length; i += 1) {
					if (oControl.getBinding(aValidateProperties[i])) {
						// check if a data type exists (which may have validation constraints)
						if (oControl.getBinding(aValidateProperties[i]).getType() || oControl.getBinding(aValidateProperties[i]).sInternalType) {
							// try validating the bound value
							try {

								if (typeof oControl.setValueState === "function") {
									oControl.setValueState("None");
									if (typeof oControl.setValueStateText === "function") {
										oControl.setValueStateText("");
									}
								}

								oControlBinding = oControl.getBinding(aValidateProperties[i]);
								oExternalValue = oControl.getProperty(aValidateProperties[i]);
								try {
									oInternalValue = oControlBinding.getType().parseValue(oExternalValue, oControlBinding.sInternalType);
									oControlBinding.getType().validateValue(oInternalValue);
								} catch (ex) {
									oInternalValue = oExternalValue;
								}

								if (typeof oControl.getRequired === "function") {
									if (oControl.getRequired() && oControl.getProperty("value") === "") {

										throw {
											message: this._referenceController.getResourceBundle().getText("FILL_REQUIRED_FIELDS")
										};
									}
								}

							}
							// catch any validation errors
							catch (ex) {
								this._isValid = false;
								oControlBinding = oControl.getBinding(aValidateProperties[i]);
								targetControl = (oControlBinding.getContext() ? oControlBinding.getContext().getPath() + "/" : "") +
									oControlBinding.getPath();

								if (typeof oControl.setValueState === "function") {
									oControl.setValueState("Error");
									if (typeof oControl.setValueStateText === "function") {
										oControl.setValueStateText(ex.message);
									}

								} else {
									sap.ui.getCore().getMessageManager().addMessages(
										new Message({
											message: ex.message,
											type: MessageType.Error,
											target: targetControl,
											processor: oControl.getBinding(aValidateProperties[i]).getModel()
										})
									);
								}

							}

							isValidatedControl = true;
						}
					}
				}

				// if the control could not be validated, it may have aggregations
				if (!isValidatedControl) {
					for (i = 0; i < aPossibleAggregations.length; i += 1) {
						aControlAggregation = oControl.getAggregation(aPossibleAggregations[i]);

						if (aControlAggregation) {
							// generally, aggregations are of type Array
							if (aControlAggregation instanceof Array) {
								for (j = 0; j < aControlAggregation.length; j += 1) {
									this._validate(aControlAggregation[j]);
								}
							}
							// ...however, with sap.ui.layout.form.Form, it is a single object *sigh*
							else {
								this._validate(aControlAggregation);
							}
						}
					}
				}
			}
		}
		this._isValidationPerformed = true;
	};
	/**
	 * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
	 * @memberof FormValidator
	 *
	 * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
	 */
	FormValidator.prototype._clearTraces = function (oControl) {
		var aPossibleAggregations = ["items", "content", "headerContainer", "_header", "form", "formContainers", "formElements", "fields",
				"_dynamicPage"
			],
			aControlAggregation = null,
			aValidateProperties = ["value", "selectedKey", "text", "dateValue"], // yes, I want to validate Select and Text controls too
			isValidatedControl = false,
			i, j;

		// only validate controls and elements which have a 'visible' property
		if (oControl instanceof sap.ui.core.Control ||
			oControl instanceof sap.ui.layout.form.FormContainer ||
			oControl instanceof sap.ui.layout.form.FormElement) {

			// only check visible controls (invisible controls make no sense checking)
			if (oControl.getVisible()) {

				// check control for any properties worth validating 
				for (i = 0; i < aValidateProperties.length; i += 1) {
					if (oControl.getBinding(aValidateProperties[i])) {
						// check if a data type exists (which may have validation constraints)
						if (oControl.getBinding(aValidateProperties[i]).getType() || oControl.getBinding(aValidateProperties[i]).sInternalType) {
							// try validating the bound value
							try {

								if (typeof oControl.setValueState === "function") {
									oControl.setValueState("None");
									if (typeof oControl.setValueStateText === "function") {
										oControl.setValueStateText("");
									}
								}

							}
							// catch any validation errors
							catch (ex) {

							}

							isValidatedControl = true;
						}
					}
				}

				// if the control could not be validated, it may have aggregations
				if (!isValidatedControl) {
					for (i = 0; i < aPossibleAggregations.length; i += 1) {
						aControlAggregation = oControl.getAggregation(aPossibleAggregations[i]);

						if (aControlAggregation) {
							// generally, aggregations are of type Array
							if (aControlAggregation instanceof Array) {
								for (j = 0; j < aControlAggregation.length; j += 1) {
									this._clearTraces(aControlAggregation[j]);
								}
							}
							// ...however, with sap.ui.layout.form.Form, it is a single object *sigh*
							else {
								this._clearTraces(aControlAggregation);
							}
						}
					}
				}
			}
		}
	};
	return FormValidator;
});