const fs = require('fs')
const nativeExec = require('child_process').exec
const { program } = require('commander')
const prompts = require('prompts')
const winston = require('winston')

const shouldContinue = async () => {
  const result = await prompts({
    type: 'confirm',
    name: 'continue',
    initial: false,
    message: 'Do you want to continue?',
  })
  if (!result.continue) {
    process.exit()
  }
  return Promise.resolve()
}

const exec = async (command, logger) => {
  return new Promise((resolve, reject) => {
    nativeExec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error(error)
        reject(stderr)
      }
      resolve(stdout)
    })
  })
}

;(async () => {
  program
    .requiredOption(
      '-i, --input <path>',
      'Input directory containing directories with film name containing VIDEO_TS folder',
    )
    .requiredOption(
      '-o, --output <path>',
      'Output directory where the .mkv files will be created, with the same name as the film directory',
    )
    .option('-l, --limit <number>', 'Limits the amount of films to convert')
    .option(
      '-c, --command <path>',
      'Location of the makemkvcon command',
      '/Applications/MakeMKV.app/Contents/MacOS/makemkvcon',
    )
  program.parse(process.argv)

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'log.log' })],
  })

  const errors = []

  const directoryContent = (await fs.readdirSync(program.input)).filter((item) => !item.startsWith('.'))
  const films = program.limit ? directoryContent.splice(0, program.limit) : directoryContent
  logger.info(`🎬 Found these films: ${films.join(', ')}`)

  await shouldContinue()

  for (film of films) {
    logger.info(`⚙️ Converting ${film}`)
    const input = `${program.input}/${film}/VIDEO_TS`
    await fs.mkdirSync(`${program.output}/temps`, { recursive: true })
    const tempOutput = await fs.mkdtempSync(`${program.output}/temps/temp-`)

    try {
      await exec(`${program.command} mkv file:"${input}" all "${tempOutput}"`, logger)

      const resultContent = await fs.readdirSync(tempOutput)
      if (resultContent.length === 1) {
        fs.renameSync(`${tempOutput}/${resultContent[0]}`, `${program.output}/${film}.mkv`)
      } else {
        await fs.mkdirSync(`${program.output}/${film}`, { recursive: true })
        for (let i = 0; i < resultContent.length; i++) {
          fs.renameSync(`${tempOutput}/${resultContent[i]}`, `${program.output}/${film}/${film}-${i}.mkv`)
        }
      }
    } catch (e) {
      errors.push(film)
    }
  }

  logger.info('✅ Done!')

  if (errors.length > 0) {
    logger.info(`🔥 There were some errors for these films: ${errors.join(', ')}`)
  }
})()
