const Taotlus = require('../models/Taotlus');
const Company = require('../models/Company');


const moment = require('moment');
const nodemailer = require('nodemailer');
const config = require('config');
const puppeteer = require('puppeteer')
const fs = require('fs')


exports.createUpdateTaotlus = async (req, res, next) => {
    try {

        const date = moment().format('DD.MM.YYYY')

        const created = new Date(moment().format());

        const {
            opilase_nimi,
            eriala,
            periood,
            maht,
            ulesanded,
            ettevote_email,
        } = req.body;

        const student = await User.find({ _id: req.user.id}).select('group')

        const taotluseFields = {
            user: req.user.id,
            opilase_nimi,
            eriala,
            oppegrupp: student[0].group,
            periood,
            maht,
            ettevote_email,
            ulesanded,
            date,
            created
        };
      
        let taotlus = await Taotlus.findOneAndUpdate(
            { user: req.user.id },
            { $set: taotluseFields },
            { new: true, upsert: true, runValidators: true }
        )

        await Taotlus.find({ _id: taotlus.id })

        const output = `
            <p>Tere!</p>
            <p>Aitäh, et olete nõus juhendama Tartu Kutsehariduskeskuse õpilase
            (${taotlus.opilase_nimi}, ${taotlus.eriala}) ettevõtte praktikat.
            Palun Teil ära täita järgnevad andmed praktikalepingu vormistamiseks.</p>
            <a href="https://tartukhk.herokuapp.com/taotlus/${taotlus.id}">Link</a>
            <p>Meeldivat koostööd soovides</br>
            praktikakoordinaator</p>
        `;

        const text = `
            Tere!

            Aitäh, et olete nõus juhendama Tartu Kutsehariduskeskuse õpilase (${taotlus.opilase_nimi}, ${taotlus.eriala}) ettevõtte praktikat.
            Palun teil ära täita järgnevad andmed praktikalepingu vormistamiseks.

            https://tartukhk.herokuapp.com/taotlus/${taotlus.id}

            Meeldivat koostööd soovides
            praktikakoordinaator
        `

                let transporter = nodemailer.createTransport({
                    // service: 'gmail',
                    host: config.get('MAIL_HOST'),
                    port: 2525,
                    auth: {
                        user: config.get('MAIL_USER'),
                        pass: config.get('MAIL_PASSWOD')
                    }
                });
            
                let mailOptions = {
                    from: 'praktika@khk.ee', 
                    to: taotlus.ettevote_email, 
                    subject: `${taotlus.opilase_nimi} praktika dokumendi link`, 
                    text: text, 
                    html: output 
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                });

        res.status(201).json({
            message: 'Täname, taotlus on saadetud!'
        });

    } catch (err) {
        next(err)
    }
}

exports.getAllTaotlus = async (req, res, next) => {
    try {
        const student = await Company.find().populate('taotlus', ['opilase_nimi', 'eriala', 'oppegrupp'])
          
        res.status(201).json(student);
    
    } catch (err) {
        next(err)
    }
}

exports.currentUserTaotlus = async (req, res, next) =>{
    try {
        const taotlus = await Taotlus.findOne({ user: req.user.id }).populate('user', ['name', 'group'])

        if (!taotlus) return res.status(400).json({ msg: 'Taotlust ei leitud' });

        res.status(201).json(taotlus);

    } catch (err) {
        next(err)
    }
}

exports.getTaotlus = async (req, res, next) => {
    try {
       
        const taotlus = await Taotlus.findById(req.params.id).populate('user' ['name', 'group']);

        if (!taotlus) return res.status(400).json({ msg: 'Taotlust ei leitud' });
  
        res.status(201).json(taotlus);
    } catch (err) {
        next(err);
    }
}

exports.getUlesanded = async (req, res, next) => {
    try {
       
        const taotlus = await Taotlus.findById(req.params.id).select('ulesanded opilase_nimi');

        if (!taotlus) return res.status(400).json({ msg: 'Taotlust ei leitud' });
  
        res.status(201).json(taotlus);
    } catch (err) {
        next(err);
    }
}

exports.createUpdateCompany = async (req, res, next) => {
    try {

        req.body.taotlus = req.params.taotluseId

        const taotlus = await Taotlus.findById(req.params.taotluseId);

        if (!taotlus) return res.status(400).json({ msg: 'Taotlust ei leitud' });

       
        console.log(taotlus);

        const {
            praktikakoha_nimi,
            praktikakoha_epost,
            praktikakoha_tel,
            praktikakoha_address,
            juriidiline_address,
            lepingu_solmija,
            allkirjastamis_alus,
            praktikajuhedaja_nimi_amet,
            praktikajuhendaja_tel,
            praktikajuhendaja_epost,
            ulesanded
        } = req.body;

        const companyFileds = {
            taotlus: req.params.taotluseId,
            praktikakoha_nimi,
            praktikakoha_epost,
            praktikakoha_tel,
            praktikakoha_address,
            juriidiline_address,
            lepingu_solmija,
            allkirjastamis_alus,
            praktikajuhedaja_nimi_amet,
            praktikajuhendaja_tel,
            praktikajuhendaja_epost,
            ulesanded,
           
        }

        let company = await Company.findOneAndUpdate(
            { taotlus: req.params.taotluseId },
            { $set: companyFileds },
            { new: true, upsert: true, runValidators: true }
        );
        
        const data = await Company.find({ taotlus: req.params.taotluseId }).populate('taotlus');

        if (!fs.existsSync(`praktikataotlused/${req.params.taotluseId}`)) {
            fs.mkdirSync(`praktikataotlused/${req.params.taotluseId}`)
        }

        const browser = await puppeteer.launch({ headless: true,  args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(`https://tartukhk.herokuapp.com/pdf/${req.params.taotluseId}`, {waitUntil: 'networkidle0'});
        await page.pdf({
            path: `praktikataotlused/${req.params.taotluseId}/${data[0].taotlus.opilase_nimi} ${data[0].taotlus.date}.pdf`, format: 'A4' 
        });
        await browser.close();

        res.status(201).json({msg: 'Täname, taotlus on saadetud!', company});
         
    } catch (err) {
        next(err)
    }
}

exports.getCompanyWithTaotlus = async (req, res, next) => {
    try {

        const data = await Company.find({ taotlus: req.params.taotluseId }).populate('taotlus');
        
        res.status(201).json(data);
         
    } catch (err) {
        next(err)
    }
}



exports.sendTaotlusIdWithEmail = async (req, res, next) => {
    try {
        const data = await Taotlus.find({ _id: req.params.taotluseId })

        const sendData = {
            nimi: data[0].opilase_nimi,
            id: data[0].id,
            eriala: data[0].eriala
        }

        toEmail = `${req.body.email}`

        const output = `
            <ul>  
                <li>Õpilane ${sendData.nimi}</li>
                <li>${sendData.eriala}</li>
                <li>www.domain.ee/taotlus/${sendData.id}</li>
                <li>Praktika taotluse <a href="www.domain.ee/taotlus/${sendData.id}">LINK</a></li>
            </ul>
        `;

        let transporter = nodemailer.createTransport({
            // service: 'gmail',
            host: config.get('MAIL_HOST'),
            port: 2525,
            auth: {
                user: config.get('MAIL_USER'),
                pass: config.get('MAIL_PASSWOD')
            }
        });
       
        let mailOptions = {
            from: 'praktika@khk.ee', 
            to: toEmail, // list of receivers
            subject: `${sendData.nimi} praktika dokumendi link`, // Subject line
            text: 'Hello world?', // plain text body
            html: output // html body
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
           
            res.status(201).json({
                data: sendData,
                info
            });
        });

    } catch (err) {
        next(err)
    }
}





