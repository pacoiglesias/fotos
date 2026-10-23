import * as pdfjsLib from "../vendor/pdf.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.mjs";
window.pdfjsLib = pdfjsLib;
