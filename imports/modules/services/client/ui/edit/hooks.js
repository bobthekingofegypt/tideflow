import { AutoForm } from 'meteor/aldeed:autoform'

AutoForm.addHooks(['updateServiceForm'], {
  before: {
    method: function (doc) {
      (Object.keys(window.editorViewDetailsHooks)||[]).map(k => {
        let p = {}
        p[k] = window.editorViewDetailsHooks[k]()
        doc = Object.assign({}, {details:p}, doc)
      })
      this.result(doc)
    }
  }
})