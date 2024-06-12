#!/usr/bin/env node

import { spawn } from "child_process";
import { getDbsRes } from "./src/db/getDbsRes";
import { handleError } from "./src/handleError";
import clinput from "./src/util/clinput";
import type { ConfigCreateNextStack } from "./src/util/config";
import logger from "./src/util/logger";

async function main() {
    /**
     * This will trigger some prompts on the terminal
     * with the clinput config on each field.
     */
    const config: ConfigCreateNextStack = {
        name: await clinput({
            type: "string",
            message: "What's your project name?",
            fallback: "my-app",
        }),
        docker: await clinput({
            type: "boolean",
            message: "Would you like to use docker?",
            fallback: true,
        }),
        dbs: await getDbsRes(),
    };

    logger.checkpoint(`Loading create-next-app for '${config.name}'...`);

    /**
     * Spawns the child process of the create-next-app
     * package. This is useful to not copy nor modify
     * the source code of that package.
     */
    const createNextApp = spawn(
        /** The command string in windows is different */
        /^win/.test(process.platform) ? "npx.cmd" : "npx",
        /** Pass in the package to run */
        ["create-next-app", config.name],
        /** Configure io to link to the current main process */
        { stdio: ["pipe", process.stdout, process.stderr] }
    );

    /**
     * TLDR: This line is needed to render correctly the prompts from
     * create-next-app process.
     *
     * Very important. It seems that the output of create-next-app
     * command needs to write raw bytes to the main process stdin to
     * clear the cli, handle arrow keys etc. It's just my impression
     * when I tested this. Maybe it's because it's using the 'prompts'
     * Nodejs library and that is doing something weird on terminal.
     */
    process.stdin.setRawMode(true);

    /**
     * The child proceess spawned needs to get the stdin of
     * the main terminal receiving user inputs.
     */
    process.stdin.pipe(createNextApp.stdin);

    createNextApp.on("error", () => {
        handleError();
    });
    createNextApp.on("close", (status) => {
        if (status != 0) {
            return handleError();
        }

        logger.checkpoint(`Creating tech stack for '${config.name}'...`);
    });
}

main();