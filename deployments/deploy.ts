import { copyFileSync, renameSync } from "fs";
import { argv } from "process";

const stage = argv[2] as "prepare" | "post";
const enviroment = argv[3] as "dev" | "test" | "live"

if(stage == "prepare") {
    // Copy current .env (which should be localhost) to safe location
    renameSync(".env", ".env-local");
    copyFileSync(`./deployments/${enviroment}.env`, ".env");
}else{
    // Default to post
    renameSync(".env-local", ".env");
}