class ReviewersController < ApplicationController

  def index
    reviewers = {}
    email_body = nil
    documents = []
    if params[:documents]
      params[:documents].each do |document_id|
        doc = Document.find(document_id)
        return json(nil, 403) unless current_account.allowed_to_edit?(doc)
        documents << doc
        reviewers[document_id] = doc.reviewers
      end
    end
    if params[:fetched_documents]
      params[:fetched_documents].each do |document_id|
        doc = Document.find(document_id)
        return json(nil, 403) unless current_account.allowed_to_edit?(doc)
        documents << doc
      end
    end
    email_body = LifecycleMailer.create_reviewer_instructions(documents, current_account, nil, "<span />").body
    json :documents => reviewers, :email_body => email_body
  end

  def create
    documents = []
    account = Account.lookup(params[:email])
    return json(nil, 409) if account and account.id == current_account.id

    if account.nil? || !account.id
      attributes = {
        :first_name => params[:first_name],
        :last_name  => params[:last_name],
        :email      => params[:email],
        :role       => Account::REVIEWER
      }
      account = current_organization.accounts.create(attributes)
    end

    if account.id
      documents = params[:documents].map do |document_id|
        document = Document.find(document_id)
        return json(nil, 403) unless current_account.allowed_to_edit?(document)
        document.add_reviewer(account, current_account)
        document.reload
      end
    end

    if !account.errors.empty?
      json account
    else
      json({:account => account, :documents => documents})
    end
  end

  def destroy
    account = Account.find(params[:account_id])
    documents = params[:documents].map do |document_id|
      document = Document.find(document_id)
      return json(nil, 403) unless current_account.allowed_to_edit?(document)
      document.remove_reviewer(account)
      document.reload
    end
    json documents
  end

  def update
    account   = current_organization.accounts.find(params[:id])
    is_owner  = current_account.id == account.id
    return json(nil, 403) unless account && (current_account.admin? || is_owner)
    account.update_attributes pick(params, :first_name, :last_name, :email) if account.role == Account::REVIEWER
    json account
  end

  def send
    return json(nil, 400) unless params[:accounts] && params[:documents]
    documents = []
    params[:documents].each do |document_id|
      document = Document.find(document_id)
      return json(nil, 403) unless current_account.allowed_to_edit?(document)
      documents << document
    end
    params[:accounts].each do |account_id|
      account = Account.find(account_id)
      account.send_reviewer_instructions(documents, current_account, params[:message])
    end
    json nil
  end


  private

  def current_document
    @document ||= Document.accessible(current_account, current_organization).find(params[:document_id])
  end

end