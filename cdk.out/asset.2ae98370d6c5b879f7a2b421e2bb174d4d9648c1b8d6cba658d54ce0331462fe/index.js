"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambdas/payment/refundPayment.ts
var refundPayment_exports = {};
__export(refundPayment_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(refundPayment_exports);
var { DynamoDB } = require("aws-sdk");
var handler = async function(event) {
  console.log("request:", JSON.stringify(event, void 0, 2));
  let paymentID = "";
  if (typeof event.ProcessPaymentResult !== "undefined") {
    paymentID = event.ProcessPaymentResult.Payload.payment_id;
  }
  const dynamo = new DynamoDB();
  var params = {
    TableName: process.env.TABLE_NAME,
    Key: {
      "pk": { S: event.trip_id },
      "sk": { S: paymentID }
    }
  };
  let result = await dynamo.deleteItem(params).promise().catch((error) => {
    throw new Error(error);
  });
  console.log("Payment has been refunded");
  console.log(result);
  return {
    status: "ok"
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
