const fs = require('fs')
const nativeExec = require('child_process').exec
const { program } = require('commander')
const prompts = require('prompts')

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

const exec = async (command) => {
  return new Promise((resolve, reject) => {
    nativeExec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(error)
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
  const errors = []

  const directoryContent = await fs.readdirSync(program.input)
  const films = program.limit ? directoryContent.splice(0, program.limit) : directoryContent
  console.log(`🎬 Found these films: ${films.join(', ')}`)

  await shouldContinue()

  for (film of films) {
    console.log(`⚙️ Converting ${film}`)
    const input = `${program.input}/${film}/VIDEO_TS`.replace(/(\s+)/g, '\\$1')
    await fs.mkdirSync(`${program.output}/temps`, { recursive: true })
    const tempOutput = await fs.mkdtempSync(`${program.output}/temps/temp-`)

    try {
      await exec(`${program.command} --debug --progress=-stdout mkv file:${input} all ${tempOutput}`)

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

  console.log('✅ Done!')

  if (Object.keys(errors)) {
    console.log(`🔥 There were some errors for these films: ${errors.join(', ')}`)
  }
})()
