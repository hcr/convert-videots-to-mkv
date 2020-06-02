const fs = require('fs')
const { program } = require('commander')

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

  const directoryContent = await fs.readdirSync(program.input)
  const films = program.limit ? directoryContent.splice(0, program.limit) : directoryContent
  console.log(`🎬 Found these films: ${films.join(', ')}`)

  for (film of films) {
    console.log(`⚙️ Converting ${film}`)
    const videoTsFolder = `${program.input}/${film}/VIDEO_TS`
  }
})()
