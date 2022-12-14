const productModel = require('../model/productModel');
const  uploadFile = require('../aws/aws.js');
const mongoose = require('mongoose');



// ------------------------------validation-------------------------------------------------

let isValidData = function (value) {
    if (typeof value === "undefined" || value === null) return false;
    if (typeof value === "string" && value.trim().length === 0) return false;
    if (typeof value === "number" && value.toString().trim().length === 0) return false
    return true;
}


let isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0;
};

let regexProduct = (/^[0-9a-fA-F]{24}$/);
let isValidPrice = (/^\d{0,8}(\.\d{1,4})?$/)

let isValidEnum = (enm) =>{
    var uniqueEnums = [...new Set(enm)];
    const enumList = ["S", "XS", "M", "X", "L", "XXL", "XL"];
    return enm.length === uniqueEnums.length && enm.every(e => enumList.includes(e));
}

  const isValidString = function(value){
      if(!/^[A-Za-z ]+$/.test(value)) {return false}
      else return true
  }
  
  const objectIdValid = function (value) {
    return mongoose.Types.ObjectId.isValid(value)
}

var nameRegex=/^[a-zA-Z\s]*$/
var priceRegex=/^[1-9]\d*(\.\d+)?$/

// ////////////////////////////////////////////////////////////////

const createProducts = async (req, res) => {
    try {

        let data = req.body;

      
        let { title, description, price, currencyId, currencyFormat, style, availableSizes, installments } = data
      
        
        if (Object.keys(req.body).length == 0)
        return res.status(400).send({ status: false, message: "please provide data" });
        
        if (!isValidData(title))
            return res.status(400).send({ status: false, message: "title name is required." });

            

        let duplicateTitle = await productModel.findOne({ title });
        if (duplicateTitle) {
            return res.status(400).send({ status: false, msg: "title already exist" });
        }

        if (!isValidData(description))
            return res.status(400).send({ status: false, message: "description is required." });

        if (!isValidData(price))
            return res.status(400).send({ status: false, message: "price is required." });

        if (!isValidPrice.test(price))
            return res.status(400).send({ status: false, message: "not a valid number/decimal" });

        if (currencyId && currencyId !== "INR")
            return res.status(400).send({ status: false, message: "enter INR currency only" });

        if (currencyFormat && currencyFormat !== "???")
            return res.status(400).send({ status: false, message: "enter indian currency format i.e '???' " });

        if (!isValidData(availableSizes))
            return res.status(400).send({ status: false, message: "avilableSizes is required" })

        const availSizes = availableSizes.split(',').map(s => s.trim().toUpperCase())

        if (!isValidEnum(availSizes))
            return res.status(400).send({ status: false, message: `only allow S, XS, M, X, L, XXL, XL` })

        if (installments) {
            if (isNaN(installments)) return res.status(400).send({ status: false, message: "installments should be number only" })
        }
        // aws=========================
        let files = req.files;
        if (!isValidRequestBody(files)) {
            return res.status(400).send({ status: false, message: "Upload a image." });
        }
        if (files.length > 0) {
            data.productImage = await uploadFile(files[0]);
          } else {
            return res
              .status(400)
              .send({ status: false, message: "ProfileImage File is required" });
          }

        const newData = { ...data, availableSizes: availSizes };

        let createdproduct = await productModel.create(newData)
        res.status(201).send({ satus: true, message: "product create successfully", data: createdproduct })


    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}
module.exports.createProducts=createProducts


// ---------------------------get product by filters-------------------------------

const getProduct = async function (req, res) {
  try {
    let data=req.query
    let { name, size, priceGreaterThan, priceLessThan,priceSort } = data;
console.log(priceSort,"124")
    if(Object.keys(data).length==0){
    let filterData= await productModel.find({isDeleted:false})
    return res.status(200).send({status:true,message:`Found ${filterData.length} Items`,data:filterData})
    }
    let filterquery={isDeleted:false}
    
    if(size){
        let checkSizes=["S", "XS","M","X", "L","XXL", "XL"]
        let arraySize=size.split(",")
        for(let i=0;i<arraySize.length;i++){
            if(checkSizes.includes(arraySize[i]))
            continue;
            else
            return res.status(400).send({status:false,message:"Sizes should in this ENUM only S/XS/M/X/L/XXL/XL"})
        }
        filterquery.availableSizes={}
        filterquery.availableSizes.$in=arraySize
    }
   
    if(name){
        if(!name)
        return res.status(400).send({status:false,message:"Name should not be empty"})
        name=name.trim()
        if(nameRegex.test(name)==false)
        return res.status(400).send({status:false,message:"You entered invalid Name"})
        filterquery.title={}
        filterquery.title.$regex=name
        filterquery.title.$options="i"
    }
    
   
   
  if (priceGreaterThan && !isValidData(priceGreaterThan))
  return res.status(400).send({ status: false, message: "provide price" });

if (!priceLessThan && isValidData(priceLessThan))
  return res.status(400).send({ status: false, message: "provide price" });


if (priceGreaterThan && priceLessThan) {
  filterquery.price = { $gte: priceGreaterThan, $lte: priceLessThan }
}
else if (priceGreaterThan) {
  filterquery.price = { $gte: priceGreaterThan }
}
else if (priceLessThan) {
  filterquery.price = { $lte: priceLessThan }
}

let searchProducts;
console.log(priceSort,"175")
if(priceSort){
  // console.log(priceSort,"189")
    if(!(priceSort== 1||priceSort == -1)){
      return res.status(400).send({status:false,msg:"priceSort should be 1 or -1 "})
        
    }} //else{

if (priceGreaterThan) {

  searchProducts = await productModel.find(filterquery).sort({ price: priceSort })
  return res.status(200).send({ status: true, msg: "price,higher to lower", data: searchProducts })

}

if (priceLessThan) {
  searchProducts = await productModel.find(filterquery).sort({ price: priceSort })
  return res.status(200).send({ status: true, msg: "price lower to higher", data: searchProducts })
}


  console.log(priceSort,"194")
let result = await productModel.find(filterquery).sort({price:priceSort})

if (result.length === 0) {
  return res.status(404).send({ status: false, msg: "No product found" });
}

res.status(200).send({ status: true, msg: "sucess", data: result });
} catch (err) {
res.status(500).send({ status: false, error: err.message });
}
};

  module.exports.getProduct=getProduct



  // ------------------get product by id------------------------------

  const getProductbyId = async function (req, res) {
    try {
        let productId = req.params.productId;
        if (!objectIdValid(productId)) return res.status(400).send({ status: false, message: "productId is invalid" });
        let product = await productModel.findById(productId)
        if (!product) return res.status(404).send({ status: false, msg: "product does not found!!!" })

        if (product.isDeleted == true)
        return res.status(400).send({ status: false, msg: "product is already deleted" })
    
        return res.status(200).send({ status: true, msg: "Product List", data: product })
    
    } catch (err) {
        return res.status(500).send({ status: false, error: err.message });
      }
    };
 
    module.exports.getProductbyId=getProductbyId
  
  
    // --------------update product by product id-----------------------
    

  
  const updateProduct = async function (req, res) {
    try {
      let productId = req.params.productId;
      let data = req.body;
  
      if (!objectIdValid(productId)) {
      return res.status(400).send({ status: false, message: "Invalid productId" })}
  
  
      let alreadyDeleted = await productModel.findOne({_id:productId, isDeleted:false})
    if (!alreadyDeleted) return res.status(404).send({ status: false, msg: "Data not found" })
  
      let { title, description, price, style, installments,isFreeShipping } = data
  
      if (Object.keys(data).length == 0)
        return res.status(400).send({ status: false, message: "please provide data" });
      
      if (title)
        if (!isValidString(title)) return res.status(400).send({ status: false, message: "title  must be alphabetic characters" })
      let isTitlePresent = await productModel.findOne({ title })
      if (isTitlePresent) return res.status(400).send({ status: false, message: "title is already present" })
  
      if (description)
  
        if (!isValidString(description)) return res.status(400).send({ status: false, message: "description  must be alphabetic characters" })
  
      if (price)
        if (!/^[0-9 .]+$/.test(price)) return res.status(400).send({ status: false, message: "price must be in numeric" })
  
      // if (currencyId)
      //   if ((["INR"].indexOf(currencyId) == -1)) return res.status(400).send({ status: false, message: "currency Id must be INR" })
  
      // if (currencyFormat)
      //   if ((["???"].indexOf(currencyFormat) == -1)) return res.status(400).send({ status: false, message: "currency formet must be ??? " })
  
      if (style)
        if (!isValidString(style)) return res.status(400).send({ status: false, message: "style must be alphabetic characters" })

        if(isFreeShipping){
            if(!typeof(isFreeShipping)== Boolean){
                return res.status(400).send({ status: false, message: "isFreeShipping must be  Boolean" })
            }
        }

      
      if (data.availableSizes){
      
        let sizes = data.availableSizes.split(/[\s,]+/)
          let arr = ["S", "XS", "M", "X", "L", "XXL", "XL"]
          console.log(sizes)
          for (let i = 0; i < sizes.length; i++) {
              if (arr.indexOf(sizes[i]) == -1)
                  return res.status(400).send({ status: false, message: "availabe sizes must be (S, XS,M,X, L,XXL, XL)" })
          }
         data["availableSizes"]= sizes
        }
  
      if (installments)
        if (!/^[0-9 ]+$/.test(installments)) return res.status(400).send({ status: false, message: "installments must be in numeric" })
  
      let files = req.files;
      if (files && files.length > 0) {
        let fileUrl = await uploadFile(files[0]);
        data.productImage = fileUrl;
      }
  
      let updatedData = await productModel.findOneAndUpdate({ _id: productId },data,{new: true});
      return res.status(200).send({status: true,message: "product details updated", data: updatedData,});
    } catch (err) {
      return res.status(500).send({ status: false, error: err.message });
    }
  };

  module.exports.updateProduct=updateProduct

  // -----------------------delete product------------------------------


  const deleteProductById = async (req, res) => {
    try {

        let productId = req.params.productId;

        if (!regexProduct.test(productId)) {
            return res.status(400).send({ status: false, message: "Invalid product id" })
        }

        let existProductId = await productModel.findById({ _id: productId })
        if (!existProductId) {
            return res.status(404).send({ status: false, message: "Product Id dosen't exists." });
        }

        if (existProductId.isDeleted === true) {
            return res.status(400).send({ status: false, message: "Product already deleted." });
        }

        let deleteProduct = await productModel.findByIdAndUpdate(productId, { $set: { isDeleted: true, deletedAt: Date.now() } }, { new: true });

        res.status(200).send({ status: true, message: "Product Successfully Deleted.", data: deleteProduct })


    } catch (error) {
        res.status(500).send({ status: false, error: error.message });
    }
}
module.exports.deleteProductById=deleteProductById