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

// lambdas/payment/processPayment.ts
var processPayment_exports = {};
__export(processPayment_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(processPayment_exports);
var { DynamoDB } = require("aws-sdk");
var handler = async function(event) {
  console.log("request:", JSON.stringify(event, void 0, 2));
  let flightReservationID = "";
  if (typeof event.ReserveFlightResult !== "undefined") {
    flightReservationID = event.ReserveFlightResult.Payload.booking_id;
  }
  let carReservationID = "";
  if (typeof event.ReserveCarRentalResult !== "undefined") {
    flightReservationID = event.ReserveCarRentalResult.Payload.booking_id;
  }
  let paymentID = hashIt("" + flightReservationID + carReservationID);
  if (event.run_type === "failPayment") {
    throw new Error("Failed to process payment");
  }
  const dynamo = new DynamoDB();
  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "pk": { S: event.trip_id },
      "sk": { S: paymentID },
      "trip_id": { S: event.trip_id },
      "id": { S: paymentID },
      "amount": { S: "750.00" },
      "currency": { S: "USD" },
      "transaction_status": { S: "confirmed" }
    }
  };
  let result = await dynamo.putItem(params).promise().catch((error) => {
    throw new Error(error);
  });
  console.log("Payment Processed Successfully:");
  console.log(result);
  return {
    status: "ok",
    payment_id: paymentID
  };
};
function hashIt(s) {
  let myHash;
  for (let i = 0; i < s.length; i++) {
    myHash = Math.imul(31, myHash) + s.charCodeAt(i) | 0;
  }
  return "" + Math.abs(myHash);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
